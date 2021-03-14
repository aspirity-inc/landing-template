// @ts-check
const {
  promises: { writeFile, readFile, rename, mkdir },
  watch: fsWatch,
} = require("fs");
const { join } = require("path");
const md5 = require("md5-file");
const { lessLoader } = require("esbuild-plugin-less");

const [, , ...args] = process.argv;
const argsSet = new Set(args);
const watch = argsSet.has("--watch");
const dev = argsSet.has("--dev");

build().then(() => {
  if (watch) {
    fsWatch(srcPath(), () => build());
  }
});

function srcPath(filename = "") {
  return join("src", filename);
}
function outPath(filename = "") {
  return join("public", filename);
}

async function processOutFile(filename) {
  if (watch) {
    return filename;
  }
  const hash = await md5(outPath(filename));
  const hashedFilename = `${hash}.${filename}`;
  await rename(outPath(filename), outPath(hashedFilename));
  return hashedFilename;
}

async function postBuild() {
  // const outJsFileName = await processOutFile("entry.js");
  const outCssFileName = await processOutFile("entry.css");
  const html = (await readFile(srcPath("index.html"), { encoding: "utf8" }))
    // .replace("%JS-FILE-NAME%", outJsFileName)
    .replace("%CSS-FILE-NAME%", outCssFileName);
  const oldHtml = await readFile(outPath("index.html"), { encoding: "utf8" });
  if (html !== oldHtml) {
    // prevent change of index.html if not needed
    await writeFile(outPath("index.html"), html, { encoding: "utf8" });
  }
  console.log(new Date(), "Build completed.");
}

async function build() {
  await mkdir(outPath(), { recursive: true });
  await require("esbuild").build({
    entryPoints: [srcPath("entry.less")],
    outdir: outPath(),
    platform: "browser",
    target: "es2017",
    plugins: [lessLoader()],
    loader: {
      ".js": "js",
      ".jsx": "jsx",
      ".css": "css",
    },
    bundle: true,
    sourcemap: true,
    minify: !dev,
    define: {
      "process.env.NODE_ENV": dev ? '"development"' : '"production"',
    },
  });
  await postBuild();
}

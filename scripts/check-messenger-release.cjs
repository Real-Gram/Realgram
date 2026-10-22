#!/usr/bin/env node
// Check the actual app import graph: excluded features must not enter the bundle.
const ts = require("../mobile-app/node_modules/typescript");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../mobile-app");
const seen = new Set();
const forbidden =
  /\/(?:ShahnamehEmbed|EcosystemFooter|GameScreen|PremiumScreen|WalletScreen|TransferScreen|DailyLuckWheelScreen|RealGram(?:Home|Earn|MoneyDesk|Chapters|ChapterDetail|Heroes|ClanHome|ClanBrowse)Screen)\.tsx$/;
function visit(file) {
  if (seen.has(file)) return;
  seen.add(file);
  if (forbidden.test(file))
    throw new Error(
      `Excluded release feature is reachable: ${path.relative(root, file)}`,
    );
  const ast = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  function dependency(spec) {
    if (!spec.startsWith(".")) return;
    const base = path.resolve(path.dirname(file), spec);
    const found = [
      base + ".ts",
      base + ".tsx",
      path.join(base, "index.ts"),
      path.join(base, "index.tsx"),
    ].find((p) => fs.existsSync(p));
    if (found) visit(found);
  }
  function walk(n) {
    if (
      ts.isImportDeclaration(n) &&
      !n.importClause?.isTypeOnly &&
      ts.isStringLiteral(n.moduleSpecifier)
    )
      dependency(n.moduleSpecifier.text);
    if (
      ts.isExportDeclaration(n) &&
      !n.isTypeOnly &&
      n.moduleSpecifier &&
      ts.isStringLiteral(n.moduleSpecifier)
    )
      dependency(n.moduleSpecifier.text);
    if (
      ts.isCallExpression(n) &&
      n.expression.getText(ast) === "require" &&
      n.arguments.length === 1 &&
      ts.isStringLiteral(n.arguments[0])
    )
      dependency(n.arguments[0].text);
    ts.forEachChild(n, walk);
  }
  walk(ast);
}
visit(path.join(root, "src/App.tsx"));
console.log(
  `Messenger release: ${seen.size} source modules checked; game and payment screens excluded.`,
);

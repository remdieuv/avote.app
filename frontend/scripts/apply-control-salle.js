const fs = require("fs");
const path = require("path");

const pagePath = path.join(
  __dirname,
  "..",
  "app",
  "admin",
  "event",
  "[eventId]",
  "page.jsx",
);
const fragmentPath = path.join(__dirname, "control-salle-fragment.jsx");

let page = fs.readFileSync(pagePath, "utf8");
const fragment = fs.readFileSync(fragmentPath, "utf8");

const start = page.indexOf(
  '                <div\n                  style={{\n                    marginTop: "0.95rem",\n                    display: "grid",\n                    gridTemplateColumns: "1fr",',
);
const endIdx = page.indexOf(
  '                <div\n                  style={{\n                    marginTop: "0.75rem",',
  start,
);
if (start === -1 || endIdx === -1) {
  throw new Error(`markers not found start=${start} end=${endIdx}`);
}

page = page.slice(0, start) + fragment + page.slice(endIdx);

fs.writeFileSync(pagePath, page, "utf8");
console.log("applied", fragment.length, "chars");

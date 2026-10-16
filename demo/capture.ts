/** Demo step 1: capture a scar from the newest fixing commit (new mistake → rate goes down). */
import { banner, git, pause, scar } from "./lib";

const sha = git(["rev-parse", "HEAD"]);
banner(`scar capture ${sha.slice(0, 7)}   (“${git(["log", "-1", "--format=%s"])}”)`);
await pause(600);
process.exit(scar(["capture", sha]));

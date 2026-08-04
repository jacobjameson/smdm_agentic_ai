/* Terminal Trainer — game engine.
   Pure logic (no DOM) so it can be unit-tested with node.
   The page layer in game.qmd handles rendering, history, and tab-completion. */

function createGame() {
  // ---------- filesystem ----------
  const dir = (children = {}) => ({ type: "dir", children });
  const file = (content = "") => ({ type: "file", content });

  const root = dir({
    "welcome.txt": file(
      "Welcome to the Terminal Trainer!\n" +
        "You just used `cat` to read a file. Nice.\n" +
        "This little world is yours to explore — you can't break anything."
    ),
    research: dir({
      "ideas.md": file("- cost-effectiveness of screening\n- microsim of readmissions"),
      "old_analysis.R": file("# TODO: clean this up someday..."),
    }),
  });

  let cwd = []; // path parts from home

  // ---------- git state ----------
  const git = {
    initialized: false,
    rootPath: null, // joined path string where `git init` ran
    branches: ["main"],
    current: "main",
    files: {}, // path -> 'untracked' | 'staged' | 'committed' | 'modified'
    commits: [], // {msg, branch, files: [paths]}
    merged: [], // branch names merged into main
    upstreams: [], // branches linked to origin via -u
    pr: { open: false, branch: null, num: 0, diffViewed: false, merged: false },
    synced: false, // local main pulled after PR merge
  };

  // ---------- mission flags ----------
  const flags = {};

  // ---------- helpers ----------
  const pathStr = (parts) => "~" + (parts.length ? "/" + parts.join("/") : "");

  function resolveParts(p) {
    let cur;
    if (p === "~" || p.startsWith("~/")) {
      cur = [];
      p = p.replace(/^~\/?/, "");
    } else if (p.startsWith("/")) {
      cur = [];
      p = p.slice(1);
    } else {
      cur = [...cwd];
    }
    for (const seg of p.split("/")) {
      if (!seg || seg === ".") continue;
      if (seg === "..") cur.pop();
      else cur.push(seg);
    }
    return cur;
  }

  function getNode(parts) {
    let n = root;
    for (const s of parts) {
      if (n.type !== "dir" || !(s in n.children)) return null;
      n = n.children[s];
    }
    return n;
  }

  function inRepo() {
    if (!git.initialized) return false;
    const here = pathStr(cwd);
    return here === git.rootPath || here.startsWith(git.rootPath + "/");
  }

  function repoFilePaths() {
    const out = [];
    const rootParts = git.rootPath === "~" ? [] : git.rootPath.slice(2).split("/");
    const base = getNode(rootParts);
    (function walk(node, parts) {
      if (!node) return;
      if (node.type === "file") {
        out.push(pathStr(parts));
        return;
      }
      for (const [name, child] of Object.entries(node.children)) walk(child, [...parts, name]);
    })(base, rootParts);
    return out;
  }

  function tokenize(line) {
    const tokens = [];
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let m;
    while ((m = re.exec(line))) tokens.push(m[1] ?? m[2] ?? m[3]);
    return tokens;
  }

  // ---------- output helpers ----------
  const L = (t, c) => ({ t, c: c || "" });

  // ---------- missions ----------
  const missions = [
    {
      title: "Look around",
      brief: [
        "Every terminal session starts somewhere. Find out where you are and what's here:",
        "  ▸ `pwd` — print your current location (working directory)",
        "  ▸ `ls`  — list what's in it",
        "  ▸ `cat welcome.txt` — print a file's contents",
      ],
      hint: "Run these three, one at a time:  pwd   then   ls   then   cat welcome.txt",
      check: () => flags.pwd && flags.lsHome && flags.catWelcome,
      done: "You can see where you are and what's around you — the #1 terminal survival skill.",
    },
    {
      title: "Move around",
      brief: [
        "Directories (folders) form a tree, and `cd` moves you through it:",
        "  ▸ `cd research` — step into the research folder (then look around with `ls`)",
        "  ▸ `cd ..` — step back up one level",
      ],
      hint: "cd research   then   ls   then   cd ..",
      check: () => flags.cdResearch && flags.lsResearch && flags.backHome,
      done: "cd + ls + pwd is 90% of terminal navigation. You've got it.",
    },
    {
      title: "Build a project",
      brief: [
        "Now make something. Create a project folder with a place for data and a script:",
        "  ▸ `mkdir my-project` — make a directory",
        "  ▸ `cd my-project`",
        "  ▸ `mkdir data`",
        "  ▸ `touch analysis.R` — create an empty file",
      ],
      hint: "mkdir my-project   cd my-project   mkdir data   touch analysis.R",
      check: () => {
        // any new top-level project dir counts — what matters is the shape:
        // you're inside a folder you made, containing a subfolder and a file
        if (!cwd.length || cwd[0] === "research") return false;
        const D = root.children[cwd[0]];
        if (!D || D.type !== "dir") return false;
        const kids = Object.values(D.children);
        return kids.some((k) => k.type === "dir") && kids.some((k) => k.type === "file");
      },
      done: "That's a real project skeleton — the same structure you'll use on course day.",
    },
    {
      title: "Write and read",
      brief: [
        "Put some content in a README using `echo` and the `>` redirect (which writes output into a file):",
        '  ▸ `echo "# My project" > README.md`',
        "  ▸ `cat README.md` — check what you wrote",
      ],
      hint: 'echo "# My project" > README.md   then   cat README.md',
      check: () => {
        // a README (any capitalization) with content, in your project folder, that you cat'ed
        if (!cwd.length) return false;
        const D = root.children[cwd[0]];
        if (!D || D.type !== "dir") return false;
        const r = Object.entries(D.children).find(
          ([n, f]) => f.type === "file" && /^readme(\.md|\.txt)?$/i.test(n)
        );
        return !!r && r[1].content.length > 0 && flags.catReadme;
      },
      done: "echo + > is the quickest way to create small files from the command line.",
    },
    {
      title: "Start tracking with git",
      brief: [
        "Time for version control. Turn this folder into a git repository:",
        "  ▸ `git init` — start tracking this folder",
        "  ▸ `git status` — see what git sees (do this constantly!)",
      ],
      hint: "git init   then   git status",
      check: () => git.initialized && flags.statusRun,
      done: "`git status` is your best friend — when in doubt, run it.",
    },
    {
      title: "Save a snapshot",
      brief: [
        "A commit is a saved snapshot. It's a two-step move — stage, then commit:",
        "  ▸ `git add .` — stage everything (the `.` means 'this directory')",
        '  ▸ `git commit -m "First commit"` — snapshot it, with a message',
        "  ▸ `git log` — see your history",
      ],
      hint: 'git add .   then   git commit -m "First commit"   then   git log',
      check: () => git.commits.length >= 1 && flags.logRun,
      done: "Small, frequent commits with clear messages = free undo + a readable history.",
    },
    {
      title: "Publish to GitHub",
      brief: [
        "Right now your commits exist only on this computer. Push them to GitHub for backup and sharing.",
        "(We've pre-connected a pretend GitHub repo for you, named `origin`.)",
        "  ▸ `git push` — try it! Watch what git tells you...",
        "  ▸ ...then follow its advice: `git push -u origin main`",
        "The `-u` links your local branch to GitHub — needed once per branch; after that, plain `git push` works.",
      ],
      hint: "git push   (read the message)   then   git push -u origin main",
      check: () => git.upstreams.includes("main"),
      done: "Your work now lives on GitHub too — backed up, shareable, and ready for collaboration.",
    },
    {
      title: "Branch out",
      brief: [
        "Branches are sandboxes — on course day, your AI agent will work in one. Make a branch, do some work, and push it:",
        "  ▸ `git switch -c figures` — create a branch called 'figures' and move to it",
        "  ▸ `touch plot.R`",
        "  ▸ `git add plot.R`",
        '  ▸ `git commit -m "Add plot script"`',
        "  ▸ `git push -u origin figures` — publish the branch",
      ],
      hint: 'git switch -c figures   touch plot.R   git add plot.R   git commit -m "Add plot script"   git push -u origin figures',
      check: () =>
        // any commit on any non-main branch, with that branch pushed — file names don't matter
        git.commits.some((c) => c.branch !== "main") &&
        git.upstreams.some((b) => b !== "main"),
      done: "Notice your prompt shows the branch you're on. main hasn't changed at all.",
    },
    {
      title: "Open a pull request — merge what you approve",
      brief: [
        "A pull request (PR) proposes your branch's work for `main` — and nothing merges until YOU approve it. This is the whole safety model of the course:",
        "  ▸ `gh pr create` — open a pull request",
        "  ▸ `gh pr diff` — READ the change (the review step — never skip it)",
        "  ▸ `gh pr merge` — merge what you approved",
        "  ▸ `git switch main` then `git pull` — sync your local main with what you merged",
      ],
      hint: "gh pr create   gh pr diff   gh pr merge   git switch main   git pull",
      check: () => git.pr.merged && git.current === "main" && git.synced,
      done: "",
    },
  ];
  let mi = 0; // current mission index
  let completed = false;

  function missionBanner() {
    const m = missions[mi];
    return [
      L(""),
      L(`━━ Mission ${mi + 1}/${missions.length} · ${m.title} ━━`, "sys"),
      ...m.brief.map((b) => L(b, "sys")),
      L("(stuck? type `hint`)", "dim"),
    ];
  }

  function winBanner() {
    return [
      L(""),
      L("🏆 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 🏆", "ok"),
      L("   YOU BEAT THE TERMINAL TRAINER!", "ok"),
      L(""),
      L("   You just ran, in miniature, the exact loop from the course:", "sys"),
      L("   branch → push → pull request → REVIEW THE DIFF → merge.", "sys"),
      L("   On course day an AI agent does the typing — and now you can", "sys"),
      L("   read every move it makes, and nothing lands without your OK.", "sys"),
      L(""),
      L("   ✅ Post \"🏆 terminal: cleared\" in the course Slack channel!", "ok"),
      L(""),
      L("   Next: do the real thing → jacobjameson.com/smdm_agentic_ai/setup.html", "info"),
      L("🏆 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 🏆", "ok"),
    ];
  }

  function checkMission() {
    const out = [];
    while (mi < missions.length && missions[mi].check()) {
      const m = missions[mi];
      out.push(L(""));
      out.push(L(`✔ Mission ${mi + 1} complete — ${m.title}`, "ok"));
      if (m.done) out.push(L("  " + m.done, "dim"));
      mi++;
      if (mi < missions.length) out.push(...missionBanner());
      else {
        completed = true;
        out.push(...winBanner());
      }
    }
    return out;
  }

  // ---------- commands ----------
  function cmdLs(args) {
    const target = args[0] ? resolveParts(args[0]) : cwd;
    const n = getNode(target);
    if (!n) return [L(`ls: cannot access '${args[0]}': No such file or directory`, "err")];
    if (n.type === "file") return [L(args[0])];
    const names = Object.keys(n.children).sort();
    if (target.length === 0) flags.lsHome = true;
    if (target.length === 1 && target[0] === "research") flags.lsResearch = true;
    if (!names.length) return [L("(empty)", "dim")];
    return [
      L(
        names
          .map((k) => (n.children[k].type === "dir" ? k + "/" : k))
          .join("   ")
      ),
    ];
  }

  function cmdCd(args) {
    if (!args[0] || args[0] === "~") {
      cwd = [];
      flags.backHome = flags.cdResearch ? true : flags.backHome;
      return [];
    }
    const target = resolveParts(args[0]);
    const n = getNode(target);
    if (!n) return [L(`cd: no such file or directory: ${args[0]}`, "err")];
    if (n.type !== "dir") return [L(`cd: not a directory: ${args[0]}`, "err")];
    cwd = target;
    if (cwd.length === 1 && cwd[0] === "research") flags.cdResearch = true;
    if (cwd.length === 0 && flags.cdResearch) flags.backHome = true;
    return [];
  }

  function cmdMkdir(args) {
    if (!args[0]) return [L("mkdir: missing operand — try: mkdir <name>", "err")];
    const target = resolveParts(args[0]);
    const name = target.pop();
    const parent = getNode(target);
    if (!parent || parent.type !== "dir")
      return [L(`mkdir: cannot create directory '${args[0]}'`, "err")];
    if (parent.children[name]) return [L(`mkdir: '${name}' already exists`, "err")];
    parent.children[name] = dir();
    return [];
  }

  function cmdTouch(args) {
    if (!args[0]) return [L("touch: missing operand — try: touch <name>", "err")];
    const target = resolveParts(args[0]);
    const name = target.pop();
    const parent = getNode(target);
    if (!parent || parent.type !== "dir") return [L(`touch: cannot create '${args[0]}'`, "err")];
    if (!parent.children[name]) {
      parent.children[name] = file("");
      if (inRepo()) git.files[pathStr([...target, name])] = "untracked";
    }
    return [];
  }

  function cmdCat(args) {
    if (!args[0]) return [L("cat: missing operand — try: cat <file>", "err")];
    const n = getNode(resolveParts(args[0]));
    if (!n) return [L(`cat: ${args[0]}: No such file or directory`, "err")];
    if (n.type === "dir") return [L(`cat: ${args[0]}: Is a directory`, "err")];
    if (args[0].includes("welcome.txt")) flags.catWelcome = true;
    if (/readme/i.test(args[0])) flags.catReadme = true;
    return n.content.split("\n").map((l) => L(l));
  }

  function cmdEcho(tokens) {
    const gt = tokens.findIndex((t) => t === ">" || t === ">>");
    if (gt === -1) return [L(tokens.join(" "))];
    const text = tokens.slice(0, gt).join(" ");
    const fname = tokens[gt + 1];
    if (!fname) return [L("echo: missing filename after redirect", "err")];
    const target = resolveParts(fname);
    const name = target.pop();
    const parent = getNode(target);
    if (!parent || parent.type !== "dir") return [L(`echo: cannot write to '${fname}'`, "err")];
    const existed = !!parent.children[name];
    if (!existed) parent.children[name] = file("");
    const f = parent.children[name];
    f.content = tokens[gt] === ">>" && existed ? (f.content ? f.content + "\n" : "") + text : text;
    const p = pathStr([...target, name]);
    if (inRepo()) {
      if (git.files[p] === "committed") git.files[p] = "modified";
      else if (!git.files[p]) git.files[p] = "untracked";
    }
    return [];
  }

  function cmdRm(args) {
    if (!args[0]) return [L("rm: missing operand — try: rm <file>", "err")];
    const target = resolveParts(args[0]);
    const name = target[target.length - 1];
    const parent = getNode(target.slice(0, -1));
    if (!parent || !parent.children[name])
      return [L(`rm: cannot remove '${args[0]}': No such file`, "err")];
    if (parent.children[name].type === "dir")
      return [L(`rm: cannot remove '${args[0]}': Is a directory (this trainer keeps it simple)`, "err")];
    delete parent.children[name];
    delete git.files[pathStr(target)];
    return [];
  }

  // ---------- git ----------
  function gitCmd(tokens) {
    const sub = tokens[0];
    if (!sub)
      return [L("usage: git <init|status|add|commit|log|branch|switch|push|pull|merge>", "err")];

    if (sub === "init") {
      if (git.initialized) return [L("Reinitialized existing Git repository", "dim")];
      git.initialized = true;
      git.rootPath = pathStr(cwd);
      for (const p of repoFilePaths()) git.files[p] = "untracked";
      return [L(`Initialized empty Git repository in ${git.rootPath}/.git/`, "ok")];
    }

    if (!git.initialized) return [L("fatal: not a git repository — run `git init` first", "err")];
    if (!inRepo()) return [L(`fatal: not inside the repository (${git.rootPath}) — cd back into it`, "err")];

    if (sub === "status") {
      flags.statusRun = true;
      const out = [L(`On branch ${git.current}`)];
      const staged = Object.entries(git.files).filter(([, s]) => s === "staged");
      const modified = Object.entries(git.files).filter(([, s]) => s === "modified");
      const untracked = Object.entries(git.files).filter(([, s]) => s === "untracked");
      if (staged.length) {
        out.push(L("Changes to be committed:", "ok"));
        staged.forEach(([p]) => out.push(L("        new file:   " + p.split("/").pop(), "ok")));
      }
      if (modified.length) {
        out.push(L("Changes not staged for commit:", "err"));
        modified.forEach(([p]) => out.push(L("        modified:   " + p.split("/").pop(), "err")));
      }
      if (untracked.length) {
        out.push(L("Untracked files:", "err"));
        untracked.forEach(([p]) => out.push(L("        " + p.split("/").pop(), "err")));
      }
      if (!staged.length && !modified.length && !untracked.length)
        out.push(L("nothing to commit, working tree clean"));
      return out;
    }

    if (sub === "add") {
      const what = tokens[1];
      if (!what) return [L("Nothing specified. Try: git add .   or   git add <file>", "err")];
      if (what === ".") {
        let n = 0;
        for (const [p, s] of Object.entries(git.files))
          if (s === "untracked" || s === "modified") {
            git.files[p] = "staged";
            n++;
          }
        return n ? [] : [L("(nothing new to add)", "dim")];
      }
      const p = pathStr(resolveParts(what));
      if (!(p in git.files)) {
        if (getNode(resolveParts(what))) {
          git.files[p] = "staged";
          return [];
        }
        return [L(`fatal: pathspec '${what}' did not match any files`, "err")];
      }
      git.files[p] = "staged";
      return [];
    }

    if (sub === "commit") {
      const mIdx = tokens.indexOf("-m");
      if (mIdx === -1 || !tokens[mIdx + 1])
        return [L('Please supply a message:  git commit -m "what you did"', "err")];
      const msg = tokens[mIdx + 1];
      const stagedPaths = Object.entries(git.files)
        .filter(([, s]) => s === "staged")
        .map(([p]) => p);
      if (!stagedPaths.length)
        return [L("nothing to commit — stage files first with `git add`", "err")];
      stagedPaths.forEach((p) => (git.files[p] = "committed"));
      git.commits.push({ msg, branch: git.current, files: stagedPaths });
      return [
        L(`[${git.current} ${"c" + git.commits.length}] ${msg}`, "ok"),
        L(` ${stagedPaths.length} file(s) changed`, "dim"),
      ];
    }

    if (sub === "log") {
      flags.logRun = true;
      if (!git.commits.length) return [L("fatal: no commits yet", "err")];
      const out = [];
      [...git.commits].reverse().forEach((c, i) => {
        out.push(L(`commit c${git.commits.length - i}  (${c.branch})`, "info"));
        out.push(L(`    ${c.msg}`));
      });
      return out;
    }

    if (sub === "branch") {
      return git.branches.map((b) =>
        L((b === git.current ? "* " : "  ") + b, b === git.current ? "ok" : "")
      );
    }

    if (sub === "switch" || sub === "checkout") {
      let create = false;
      let name;
      if (tokens[1] === "-c" || tokens[1] === "-b") {
        create = true;
        name = tokens[2];
      } else name = tokens[1];
      if (!name) return [L(`usage: git switch <branch>   or   git switch -c <new-branch>`, "err")];
      if (create) {
        if (git.branches.includes(name)) return [L(`fatal: a branch named '${name}' already exists`, "err")];
        git.branches.push(name);
        git.current = name;
        return [L(`Switched to a new branch '${name}'`, "ok")];
      }
      if (!git.branches.includes(name))
        return [L(`fatal: invalid reference: ${name} (create it with: git switch -c ${name})`, "err")];
      git.current = name;
      return [L(`Switched to branch '${name}'`, "ok")];
    }

    if (sub === "push") {
      if (!git.commits.length)
        return [L("error: nothing to push — make a commit first", "err")];
      let rest = tokens.slice(1);
      let setUpstream = false;
      let branch = null;
      if (rest[0] === "-u" || rest[0] === "--set-upstream") {
        setUpstream = true;
        rest = rest.slice(1);
      }
      if (rest[0] === "origin") {
        branch = rest[1] || null;
        rest = rest.slice(2);
      } else if (rest.length && rest[0] !== "origin") {
        return [L(`fatal: '${rest[0]}' does not appear to be a git repository (the remote here is named origin)`, "err")];
      }
      if (setUpstream && !branch)
        return [L("usage: git push -u origin <branch-name>", "err")];
      if (branch && branch !== git.current)
        return [
          L(`error: you're on '${git.current}' but tried to push '${branch}'.`, "err"),
          L(`Push the branch you're on:  git push -u origin ${git.current}`, "info"),
        ];
      if (!setUpstream && !git.upstreams.includes(git.current))
        return [
          L(`fatal: the current branch ${git.current} has no upstream branch.`, "err"),
          L("To push and link it to GitHub (first time only), use:", "info"),
          L(`    git push -u origin ${git.current}`, "info"),
        ];
      if (setUpstream && !git.upstreams.includes(git.current)) git.upstreams.push(git.current);
      const isNew = setUpstream;
      return [
        L("Enumerating objects... done.", "dim"),
        L("To github.com:you/my-project.git", "dim"),
        isNew
          ? L(` * [new branch]      ${git.current} -> ${git.current}`, "ok")
          : L(`   ${git.current} -> ${git.current}`, "ok"),
        ...(isNew
          ? [L(`Branch '${git.current}' set up to track 'origin/${git.current}'.`, "dim")]
          : []),
      ];
    }

    if (sub === "pull") {
      if (git.pr.merged && git.current === "main" && !git.synced) {
        git.synced = true;
        return [
          L("Updating main..origin/main", "dim"),
          L("Fast-forward", "ok"),
          L(" plot.R | 1 +", "dim"),
          L(" 1 file changed", "dim"),
        ];
      }
      return [L("Already up to date.", "dim")];
    }

    if (sub === "merge") {
      const name = tokens[1];
      if (!name) return [L("usage: git merge <branch>", "err")];
      if (!git.branches.includes(name)) return [L(`merge: ${name} — not something we can merge`, "err")];
      if (name === git.current) return [L(`Already up to date.`, "dim")];
      return [
        L("You *could* merge locally — but in this trainer (and in the course!) we", "sys"),
        L("merge through a pull request, so there's always a review step:", "sys"),
        L("    gh pr create   →   gh pr diff   →   gh pr merge", "info"),
      ];
    }

    return [L(`git: '${sub}' is not a git command this trainer knows. Try: init status add commit log branch switch push pull merge`, "err")];
  }

  // ---------- gh (GitHub CLI) ----------
  function ghCmd(tokens) {
    if (tokens[0] !== "pr")
      return [L("usage: gh pr <create|diff|merge>   (this trainer supports the pr commands)", "err")];
    if (!git.initialized) return [L("fatal: not a git repository", "err")];
    const sub = tokens[1];

    if (sub === "create") {
      if (git.current === "main")
        return [
          L("error: you're on main — a pull request proposes a *branch* into main.", "err"),
          L("Switch to your feature branch first:  git switch figures", "info"),
        ];
      if (!git.upstreams.includes(git.current))
        return [
          L("error: your branch isn't on GitHub yet.", "err"),
          L(`Push it first:  git push -u origin ${git.current}`, "info"),
        ];
      if (git.pr.open) return [L(`a pull request for '${git.pr.branch}' already exists (#${git.pr.num})`, "dim")];
      git.pr.open = true;
      git.pr.branch = git.current;
      git.pr.num += 1;
      git.pr.diffViewed = false;
      return [
        L(`Creating pull request for ${git.current} into main in you/my-project`, "dim"),
        L(""),
        L(`https://github.com/you/my-project/pull/${git.pr.num}`, "ok"),
        L(""),
        L("Before you merge: READ THE DIFF →  gh pr diff", "sys"),
      ];
    }

    if (sub === "diff") {
      if (!git.pr.open) return [L("no open pull request — create one with: gh pr create", "err")];
      git.pr.diffViewed = true;
      const prFiles = [
        ...new Set(
          git.commits.filter((c) => c.branch === git.pr.branch).flatMap((c) => c.files)
        ),
      ];
      const out = [];
      prFiles.forEach((p) => {
        const name = p.split("/").pop();
        out.push(L(`diff --git a/${name} b/${name}`, "info"));
        out.push(L(`new file: ${name}`, "ok"));
        out.push(L(`+ (contents of ${name})`, "ok"));
      });
      out.push(L(""));
      out.push(L("That's everything this PR would change. Nothing else. If it looks right → gh pr merge", "dim"));
      return out;
    }

    if (sub === "merge") {
      if (!git.pr.open) return [L("no open pull request — create one with: gh pr create", "err")];
      if (!git.pr.diffViewed)
        return [
          L("⚠ You haven't reviewed this PR.", "err"),
          L("The one rule of the course: never merge what you haven't reviewed.", "sys"),
          L("Read it first:  gh pr diff", "info"),
        ];
      git.pr.open = false;
      git.pr.merged = true;
      git.merged.push(git.pr.branch);
      return [
        L(`✔ Squashed and merged pull request #${git.pr.num} (${git.pr.branch} → main)`, "ok"),
        L("✔ Deleted branch on GitHub", "dim"),
        L(""),
        L("Your local main doesn't know yet — sync it:", "sys"),
        L("    git switch main   then   git pull", "info"),
      ];
    }

    return [L("usage: gh pr <create|diff|merge>", "err")];
  }

  // ---------- dispatcher ----------
  function run(line) {
    const out = [];
    const tokens = tokenize(line.trim());
    if (!tokens.length) return { out, prompt: promptStr(), completed };
    const cmd = tokens[0];
    const args = tokens.slice(1);

    switch (cmd) {
      case "pwd":
        flags.pwd = true;
        out.push(L(pathStr(cwd)));
        break;
      case "ls":
        out.push(...cmdLs(args));
        break;
      case "cd":
        out.push(...cmdCd(args));
        break;
      case "mkdir":
        out.push(...cmdMkdir(args));
        break;
      case "touch":
        out.push(...cmdTouch(args));
        break;
      case "cat":
        out.push(...cmdCat(args));
        break;
      case "echo":
        out.push(...cmdEcho(args));
        break;
      case "rm":
        out.push(...cmdRm(args));
        break;
      case "git":
        out.push(...gitCmd(args));
        break;
      case "gh":
        out.push(...ghCmd(args));
        break;
      case "clear":
        return { out, prompt: promptStr(), clear: true, completed };
      case "help":
        out.push(
          L("Files & folders:  pwd · ls · cd <dir> · cd .. · mkdir <name> · touch <name> · cat <file> · echo \"text\" > <file> · rm <file>", "info"),
          L("Git:              git init · git status · git add · git commit -m \"msg\" · git log · git branch · git switch [-c] · git push [-u origin <br>] · git pull", "info"),
          L("GitHub:           gh pr create · gh pr diff · gh pr merge", "info"),
          L("Trainer:          hint · missions · clear · help", "info")
        );
        break;
      case "hint":
        if (mi < missions.length) out.push(L("💡 " + missions[mi].hint, "sys"));
        else out.push(L("You're done — nothing left to hint!", "ok"));
        break;
      case "missions":
      case "progress":
        missions.forEach((m, i) => {
          const mark = i < mi ? "✔" : i === mi ? "▶" : "·";
          out.push(L(`${mark} Mission ${i + 1}: ${m.title}`, i < mi ? "ok" : i === mi ? "sys" : "dim"));
        });
        break;
      default:
        out.push(L(`command not found: ${cmd} — type \`help\` to see what this trainer supports`, "err"));
    }

    if (!completed) out.push(...checkMission());
    return { out, prompt: promptStr(), completed };
  }

  function promptStr() {
    const branch = git.initialized && inRepo() ? ` (${git.current})` : "";
    return `you@smdm:${pathStr(cwd)}${branch}$`;
  }

  function intro() {
    return [
      L("┌──────────────────────────────────────────────────────────┐", "info"),
      L("│           TERMINAL TRAINER · pre-work edition            │", "info"),
      L("│  9 short missions: navigate, build, commit, push, merge  │", "info"),
      L("└──────────────────────────────────────────────────────────┘", "info"),
      L("This is a safe, simulated terminal — you cannot break anything.", "dim"),
      L("Type `help` anytime for the command list, `hint` if you're stuck.", "dim"),
      ...missionBanner(),
    ];
  }

  return {
    run,
    intro,
    promptStr,
    missionCount: missions.length,
    cwdEntries: () => {
      const n = getNode(cwd);
      return n ? Object.keys(n.children) : [];
    },
    _state: { git, flags, missions: () => mi, isComplete: () => completed },
  };
}

if (typeof module !== "undefined" && module.exports) module.exports = { createGame };

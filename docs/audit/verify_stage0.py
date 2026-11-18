"""Read-only checks for the stage-0 documentation delivery (standard library only)."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    docs = root / "docs"
    failures = []
    checks = []

    def check(name, condition, detail=""):
        checks.append({"check": name, "passed": bool(condition), "detail": detail})
        if not condition:
            failures.append(name)

    required = [
        "PROJECT_VISION", "TECHNICAL_SPECIFICATION", "ARCHITECTURE",
        "DATABASE_SCHEMA", "API_CONTRACTS", "ROADMAP", "TEST_PLAN",
        "ISSUES", "CHANGELOG", "DECISIONS",
    ]
    check("required_documents", all(
        (docs / (name + ".md")).is_file()
        and (docs / (name + ".md")).stat().st_size > 200
        for name in required
    ), "10 required Markdown documents")

    baseline = json.loads((docs / "audit/baseline.json").read_text(encoding="utf-8-sig"))
    check("baseline_count", len(baseline) == 170, str(len(baseline)))
    expected = set()
    originals_bad = []
    backup_bad = []
    for entry in baseline:
        relative = entry["Path"].replace("\\", "/")
        expected.add(relative)
        path = root / relative
        if (not path.is_file() or path.stat().st_size != entry["Bytes"]
                or hashlib.sha256(path.read_bytes()).hexdigest() != entry["SHA256"]):
            originals_bad.append(relative)
        if args.checkpoint:
            copy = args.checkpoint / relative
            if (not copy.is_file() or copy.stat().st_size != entry["Bytes"]
                    or hashlib.sha256(copy.read_bytes()).hexdigest() != entry["SHA256"]):
                backup_bad.append(relative)
    check("originals_unchanged", not originals_bad, ", ".join(originals_bad) or "170 hashes match")
    if args.checkpoint:
        check("checkpoint_matches", not backup_bad, ", ".join(backup_bad) or "170 backup hashes match")

    actual_outside_docs = {
        path.relative_to(root).as_posix()
        for path in root.rglob("*")
        if path.is_file() and path.relative_to(root).parts[0] != "docs"
    }
    # TRAVEL-011 explicitly authorizes one root instruction file, not application files.
    allowed_instruction_files = {"AGENTS.md"}
    unexpected = sorted(actual_outside_docs - expected - allowed_instruction_files)
    check("no_out_of_scope_files", not unexpected, ", ".join(unexpected) or "Only docs and authorized root AGENTS.md added")

    markdown = sorted(docs.rglob("*.md"))
    if (root / "AGENTS.md").is_file():
        markdown.append(root / "AGENTS.md")
    broken_links = []
    unbalanced = []
    for path in markdown:
        content = path.read_text(encoding="utf-8-sig")
        if sum(bool(re.match(r"^\s*```", line)) for line in content.splitlines()) % 2:
            unbalanced.append(path.relative_to(root).as_posix())
        for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", content):
            target = target.strip().strip("<>")
            parts = urlsplit(target)
            if parts.scheme or target.startswith("#"):
                continue
            local_target = unquote(parts.path)
            if local_target and not (path.parent / local_target).exists():
                broken_links.append(path.relative_to(root).as_posix() + ": " + target)
    check("local_markdown_links", not broken_links, "; ".join(broken_links) or "All local targets exist")
    check("markdown_fences", not unbalanced, ", ".join(unbalanced) or "Balanced code fences")

    roadmap = (docs / "ROADMAP.md").read_text(encoding="utf-8")
    tasks = re.findall(r"^### (TRAVEL-\d{3})[^\n]*\n(.*?)(?=^### |^## |\Z)", roadmap, re.M | re.S)
    check("first_ten_tasks", [task[0] for task in tasks] == [
        "TRAVEL-" + str(n).zfill(3) for n in range(1, 11)
    ], ", ".join(task[0] for task in tasks))
    fields = ["Цель:", "План реализации:", "Зависимости:", "Критерии приёмки:", "Тесты:", "Риски:", "Статус:"]
    missing = [task_id + ": " + field for task_id, body in tasks for field in fields if field not in body]
    check("task_required_fields", not missing, "; ".join(missing) or "7 fields in each task")
    check("roadmap_stages_0_to_8", all(
        re.search(r"^\| " + str(n) + r"\.", roadmap, re.M) for n in range(9)
    ), "9 stage rows")

    skills = json.loads((root / "skills-lock.json").read_text(encoding="utf-8-sig"))["skills"]
    required_skills = {"frontend-design", "web-design-guidelines", "vercel-react-best-practices", "vercel-composition-patterns", "ui-ux-pro-max"}
    check("five_skills_present", set(skills) == required_skills and all(
        (root / ".agents/skills" / skill / "SKILL.md").is_file() for skill in required_skills
    ), "Original five skills, including ui-ux-pro-max")
    check("no_product_manifests", not any((root / name).exists() for name in (
        "package.json", "package-lock.json", "pyproject.toml", "compose.yaml", "docker-compose.yml", ".git"
    )), "No scaffolding, dependency install or git init")

    print(json.dumps({
        "status": "PASS" if not failures else "FAIL",
        "scope": "Documentation/baseline only; no product tests",
        "checks": checks,
        "passed": len(checks) - len(failures), "failed": len(failures),
        "markdown_files": len(markdown),
    }, indent=2, ensure_ascii=True))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

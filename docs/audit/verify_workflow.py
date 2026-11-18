"""Read-only TRAVEL-011 scope, preservation and skill availability checks."""

import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys


def main():
    root = Path(__file__).resolve().parents[2]
    audit = root / "docs/audit"
    manifest = json.loads((audit / "workflow_baseline.json").read_text(encoding="utf-8-sig"))
    checks = []

    def check(name, passed, detail):
        checks.append({"check": name, "passed": bool(passed), "detail": detail})

    modified_allowed = {
        "docs/README.md", "docs/SKILLS_AUDIT.md", "docs/CHANGELOG.md",
        "docs/audit/verify_stage0.py",
    }
    new_allowed = {
        "AGENTS.md", "docs/WORKFLOW.md", "docs/audit/WORKFLOW_VALIDATION.md",
        "docs/audit/workflow_baseline.json", "docs/audit/verify_workflow.py",
        "docs/audit/workflow_validation.json", "docs/audit/skill_scan.json",
    }
    protected_changed = []
    expected_paths = set()
    changed = []
    for entry in manifest:
        relative = entry["Path"].replace("\\", "/")
        expected_paths.add(relative)
        path = root / relative
        matches = (path.is_file() and path.stat().st_size == entry["Bytes"]
                   and hashlib.sha256(path.read_bytes()).hexdigest() == entry["SHA256"])
        if not matches:
            changed.append(relative)
            if relative not in modified_allowed or not path.is_file():
                protected_changed.append(relative)
    check("checkpoint_manifest_count", len(manifest) == 188, len(manifest))
    check("protected_files_unchanged", not protected_changed,
          protected_changed or "184 protected files match; only 4 analyzed files may change")
    check("exact_modified_scope", set(changed) == modified_allowed, changed)
    current = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}
    added = current - expected_paths
    check("exact_new_scope", added == new_allowed, sorted(added))

    instructions = (root / "AGENTS.md").read_text(encoding="utf-8")
    policy_markers = [
        "функциональность", "тестирование", "Геймификация запрещена",
        "Код приложения пока не создавать и не менять", "минимальный достаточный набор",
        "Существующие документы сначала анализировать", "не логировать",
        "Не делать destructive migration",
    ]
    missing = [marker for marker in policy_markers if marker not in instructions]
    check("root_policy", not missing, missing or "Priorities, scope, skill selection, docs and safety present")

    lock = json.loads((root / "skills-lock.json").read_text(encoding="utf-8-sig"))["skills"]
    skill_dirs = {p.name for p in (root / ".agents/skills").iterdir() if p.is_dir()}
    skill_errors = []
    for name in sorted(lock):
        path = root / ".agents/skills" / name / "SKILL.md"
        if not path.is_file():
            skill_errors.append(name + ": missing SKILL.md")
            continue
        content = path.read_text(encoding="utf-8")
        frontmatter = content.split("---", 2)[1]
        match = re.search(r"^name:\s*['\"]?([^\r\n'\"]+)", frontmatter, re.M)
        if not match or match.group(1).strip() != name or "description:" not in frontmatter:
            skill_errors.append(name + ": invalid name/description")
    check("five_skill_definitions", len(lock) == 5 and skill_dirs == set(lock) and not skill_errors,
          skill_errors or sorted(skill_dirs))
    check("no_skill_bytecode", not any((root / ".agents/skills").rglob("__pycache__")),
          "Smoke/scanner must not alter installed packages")

    workflow = (root / "docs/WORKFLOW.md").read_text(encoding="utf-8")
    required_fields = ["Цель:", "План реализации:", "Зависимости:", "Критерии приёмки:", "Тесты:", "Риски:", "Статус:"]
    check("travel_011_task_fields", "TRAVEL-011" in workflow and all(f in workflow for f in required_fields),
          "7 required task fields")

    stage0 = subprocess.run([sys.executable, "-B", str(audit / "verify_stage0.py")],
                            capture_output=True, text=True, encoding="utf-8")
    check("stage0_regression", stage0.returncode == 0,
          json.loads(stage0.stdout) if stage0.stdout.strip().startswith("{") else stage0.stderr[:300])
    failed = sum(not c["passed"] for c in checks)
    print(json.dumps({"status": "FAIL" if failed else "PASS", "checks": checks,
                      "passed": len(checks) - failed, "failed": failed,
                      "scope": "Instructions/docs only; no application tests"}, indent=2, ensure_ascii=True))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

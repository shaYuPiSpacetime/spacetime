#!/usr/bin/env python3
"""
彻底重建 PRD-01 菜单结构：
1. 删除所有乱七八糟的 F 类型一级条目
2. 删除 fix-menus.py 创建的重复条目
3. 按 DDL schema-prd01-user.sql 的正确结构重建
"""
import sys, json, urllib.request, urllib.error

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"

def req(method, path, token=None, body=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["X-Auth-Token"] = token
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {"msg": raw}
    except Exception as e:
        return 0, {"code": -1, "msg": str(e)}

def jget(d, key, default=None):
    if isinstance(d, dict):
        if key in d: return d[key]
        for v in d.values():
            r = jget(v, key, default)
            if r != default: return r
    return default

# 1. Login
print("=== 1. Login ===")
_, login = req("POST", "/admin/login", body={"account": "peter", "password": "000000"})
TOKEN = jget(login, "token")
print(f"  token={TOKEN}")

# 2. Get current full menu tree to understand what's there
print("\n=== 2. Current Menu Tree (PRD-01 related) ===")
_, tree = req("GET", "/admin/menu/tree", token=TOKEN)
tree_data = jget(tree, "data") or []

def flat(items, parent=None):
    """Flatten tree to list with parent info"""
    result = []
    for item in items:
        result.append((item, parent))
        children = item.get("children", [])
        if children:
            result.extend(flat(children, item))
    return result

all_menus = flat(tree_data)

# Find all PRD-01 related menus (anything with verify: / moderation: / user:app: perms, or in PRD-01 directories)
prd01_dirs = {"用户准入", "认证审核", "内容审核"}
prd01_menus = set()
for item, _ in all_menus:
    name = item.get("menuName", "")
    perms = item.get("perms", "") or ""
    # Check if it's in a PRD-01 dir or has PRD-01 perms
    if name in prd01_dirs or any(p in perms for p in ["verify:", "moderation:", "user:app:"]):
        prd01_menus.add(item["id"])
        # Also add children
        for child, _ in flat(item.get("children", [])):
            prd01_menus.add(child["id"])

# Also find orphaned F-type entries (parentId=0 and verify/moderation perms)
for item, parent in all_menus:
    perms = item.get("perms", "") or ""
    if any(p in perms for p in ["verify:", "moderation:", "user:app:"]) and item["id"] not in prd01_menus:
        prd01_menus.add(item["id"])

print(f"  Found {len(prd01_menus)} PRD-01 related menu IDs")

# 3. Delete all PRD-01 related menus (we'll recreate cleanly)
print("\n=== 3. Deleting all PRD-01 menus ===")
# Delete children first, then parents — start from leaves
# Sort by ID descending so children (higher IDs) are deleted first
sorted_ids = sorted(prd01_menus, reverse=True)
for mid in sorted_ids:
    code, resp = req("DELETE", f"/admin/menu/{mid}", token=TOKEN)
    # Find the name from the original data
    name = "?"
    for item, _ in all_menus:
        if item["id"] == mid:
            name = item.get("menuName", "?")
            break
    print(f"  DELETE id={mid} name={name} -> code={code}")

# 4. Get role 1's current menu IDs (should have PRD-01 items removed now)
print("\n=== 4. Update role 1 menu bindings ===")
_, role_detail = req("GET", "/admin/role/1", token=TOKEN)
detail = jget(role_detail, "data") or role_detail
current_menu_ids = detail.get("menuIds", []) if isinstance(detail, dict) else []
# Remove any PRD-01 IDs
clean_ids = [mid for mid in current_menu_ids if mid not in prd01_menus]
print(f"  Role menus: {len(current_menu_ids)} -> {len(clean_ids)} after cleanup")
code, _ = req("PUT", f"/admin/role/1/menus", token=TOKEN, body={"menuIds": clean_ids})
print(f"  Bind result: code={code}")

# 5. Recreate correct structure
print("\n=== 5. Creating correct menu structure ===")

# Define the full structure according to DDL
# Each entry: (menuName, menuType, perms, sort, visible, path, component, icon)
DIRS = [
    ("用户准入", "M", "", 50, 1, "", "", "UserCheck"),
    ("认证审核", "M", "", 60, 1, "", "", "Shield"),
    ("内容审核", "M", "", 70, 1, "", "", "ShieldAlert"),
]

# Children of 用户准入
USER_MENUS = [
    ("App用户管理", "C", "user:app:list", 1, 1, "/customers", "users/AppUserManagement", ""),
]
USER_BUTTONS = [
    ("查看详情", "F", "user:app:detail", 1, 0, "", "", ""),
    ("冻结解冻", "F", "user:app:freeze", 2, 0, "", "", ""),
]

# Children of 认证审核
VERIFY_MENUS = [
    ("实名认证审核", "C", "verify:realname:list", 1, 1, "/verify/real-name", "verify/VerificationManagementPage", ""),
    ("学历认证审核", "C", "verify:education:list", 2, 1, "/verify/education", "verify/VerificationManagementPage", ""),
    ("头像认证审核", "C", "verify:avatar:list", 3, 1, "/verify/avatar", "verify/VerificationManagementPage", ""),
]
VERIFY_BUTTONS = {
    "实名认证审核": [("实名审核", "F", "verify:realname:audit", 1, 0, "", "", "")],
    "学历认证审核": [("学历审核", "F", "verify:education:audit", 1, 0, "", "", "")],
    "头像认证审核": [("头像审核", "F", "verify:avatar:audit", 1, 0, "", "", "")],
}

# Children of 内容审核
MODERATION_MENUS = [
    ("资料照片审核", "C", "moderation:photo:list", 1, 1, "/moderation/photos", "moderation/ModerationPage", ""),
    ("文字内容审核", "C", "moderation:text:list", 2, 1, "/moderation/texts", "moderation/ModerationPage", ""),
]
MODERATION_BUTTONS = {
    "资料照片审核": [("照片审核", "F", "moderation:photo:audit", 1, 0, "", "", "")],
    "文字内容审核": [("文字审核", "F", "moderation:text:audit", 1, 0, "", "", "")],
}

created = {}  # name -> id
all_created_ids = []

# Helper to create a menu entry
def create_menu(name, mtype, perms, sort, visible, path, component, icon, parent_id):
    body = {
        "menuName": name,
        "menuType": mtype,
        "menuSort": sort,
        "status": "ENABLED",
        "visible": visible,
    }
    if parent_id:
        body["parentId"] = parent_id
    if path:
        body["path"] = path
    if component:
        body["component"] = component
    if perms:
        body["perms"] = perms
    if icon:
        body["icon"] = icon

    code, resp = req("POST", "/admin/menu", token=TOKEN, body=body)
    mid = jget(resp, "data")
    if mid:
        print(f"  [OK] id={mid} type={mtype} name={name} parentId={parent_id}")
    else:
        print(f"  [FAIL] {name}: code={code} resp={json.dumps(resp, ensure_ascii=False)[:100]}")
    return mid

# Create directories
for name, mtype, perms, sort, visible, path, component, icon in DIRS:
    mid = create_menu(name, mtype, perms, sort, visible, path, component, icon, 0)
    if mid:
        created[name] = mid
        all_created_ids.append(mid)

# Create 用户准入 children
print()
for name, mtype, perms, sort, visible, path, component, icon in USER_MENUS:
    mid = create_menu(name, mtype, perms, sort, visible, path, component, icon, created["用户准入"])
    if mid:
        created[name] = mid
        all_created_ids.append(mid)
for name, mtype, perms, sort, visible, path, component, icon in USER_BUTTONS:
    mid = create_menu(name, mtype, perms, sort, visible, path, component, icon, created["App用户管理"])
    if mid:
        all_created_ids.append(mid)

# Create 认证审核 children
print()
for name, mtype, perms, sort, visible, path, component, icon in VERIFY_MENUS:
    mid = create_menu(name, mtype, perms, sort, visible, path, component, icon, created["认证审核"])
    if mid:
        created[name] = mid
        all_created_ids.append(mid)
        # Create buttons under this menu
        for bname, btype, bperms, bsort, bvisible, bpath, bcomp, bicon in VERIFY_BUTTONS.get(name, []):
            bmid = create_menu(bname, btype, bperms, bsort, bvisible, bpath, bcomp, bicon, mid)
            if bmid:
                all_created_ids.append(bmid)

# Create 内容审核 children
print()
for name, mtype, perms, sort, visible, path, component, icon in MODERATION_MENUS:
    mid = create_menu(name, mtype, perms, sort, visible, path, component, icon, created["内容审核"])
    if mid:
        created[name] = mid
        all_created_ids.append(mid)
        for bname, btype, bperms, bsort, bvisible, bpath, bcomp, bicon in MODERATION_BUTTONS.get(name, []):
            bmid = create_menu(bname, btype, bperms, bsort, bvisible, bpath, bcomp, bicon, mid)
            if bmid:
                all_created_ids.append(bmid)

print(f"\n  Total created: {len(all_created_ids)} menus")

# 6. Bind to role 1
print("\n=== 6. Bind to role 1 ===")
_, role_detail = req("GET", "/admin/role/1", token=TOKEN)
detail = jget(role_detail, "data") or role_detail
current_ids = detail.get("menuIds", []) if isinstance(detail, dict) else []
merged = list(set(list(current_ids) + all_created_ids))
code, _ = req("PUT", f"/admin/role/1/menus", token=TOKEN, body={"menuIds": merged})
print(f"  Bind: {len(merged)} menus, code={code}")

# 7. Verify
print("\n=== 7. Verify ===")
_, routers = req("GET", "/admin/routers", token=TOKEN)
rdata = jget(routers, "data") or []

def pt(items, indent=0):
    for item in items:
        name = item.get("meta", {}).get("title", item.get("name", "?"))
        path = item.get("path", "")
        print(f"  {'  ' * indent}- {name} ({path})")
        children = item.get("children", [])
        if children:
            pt(children, indent + 1)

print("  Router tree (PRD-01 sections only):")
for d in rdata:
    name = d.get("meta", {}).get("title", d.get("name", ""))
    if name in prd01_dirs:
        pt([d])

# Check menu management page — all F-type should have proper parentId
print()
_, tree2 = req("GET", "/admin/menu/tree", token=TOKEN)
tree_data2 = jget(tree2, "data") or []

# Check for orphaned F-type entries
for item, parent in flat(tree_data2):
    perms = item.get("perms", "") or ""
    if any(p in perms for p in ["verify:", "moderation:", "user:app:"]):
        pid = item.get("parentId") or 0
        pname = parent.get("menuName", "ROOT") if parent else "ROOT"
        if pid == 0 or pname == "ROOT":
            print(f"  [WARN] Orphaned: id={item['id']} name={item.get('menuName')} type={item.get('menuType')} perms={perms} parentId={pid}")
        else:
            print(f"  [OK] id={item['id']} name={item.get('menuName')} type={item.get('menuType')} perms={perms} -> parent={pname}")

print("\n=== DONE ===")

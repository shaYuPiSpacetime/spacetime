# Windows GitHub 拉取、推送与代理排查

> 适用：当前 Windows 开发机、Spacetime 仓库。最后实测：2026-09-23。
> 每次处理 Git 网络失败先读本文。浏览器能访问 GitHub 时，先检查浏览器/系统代理与 Git 的差异，不能仅凭命令行 DNS 失败就判断电脑无法访问 GitHub。

## 1. 本次原因与已经保存的配置

| 项目 | 实测结果 |
|---|---|
| Windows 系统代理 | 已启用，`127.0.0.1:7897` |
| 代理监听进程 | `verge-mihomo` |
| 通过该 HTTP 代理访问 GitHub | `200 Connection established`，随后 `200 OK` |
| 仓库 origin | `ssh://git@ssh.github.com:443/shaYuPiSpacetime/spacetime.git` |
| 原 Git SSH 路径 | 未配置代理，直连时域名解析失败 |
| WinHTTP 代理 | Direct access；与 Windows Internet Settings 的代理配置不同 |
| 解决方法 | SSH 通过 Git 自带 `connect.exe` 使用系统的 HTTP 代理建立 CONNECT 隧道 |
| 配置位置 | 本仓库 `.git/config` 的 `core.sshCommand`；不修改全局配置，不改变 origin |

浏览器登录状态和 Git 的 SSH 认证是两条独立链路。截图证明浏览器访问正常；本次实测证明该机器的系统代理可用，而之前 Git 没有接入。配置代理后，Git 已能使用原有 SSH 身份访问私有仓库，不需要提供浏览器 Cookie 或重新登录网页。

之前的排查只验证了直连和 DNS，没有继续检查系统代理，过早认定网络不可用。以后应执行下面的顺序。

## 2. 已配置好的日常操作

保持代理客户端运行，确认当前分支与工作区，再使用普通 Git 命令即可：

```powershell
git status --short
git branch --show-current
git fetch origin
# 当前在 master 时，检查并快进同步；若发生分叉，先查看双方提交，不强制覆盖。
git merge --ff-only origin/master
# 仅暂存本次任务的明确文件，提交后推送。
git push origin master
# 最后核对远端实际提交，不能只看本地 origin/master 缓存。
git rev-parse HEAD
git ls-remote origin refs/heads/master
```

如果当前任务已有本地提交、远端发生分叉，按项目 Git 流程处理合并；先保留现有未提交改动，不自动 `reset --hard`、不强推、不把他人改动顺手提交。

## 3. 网络失败时的固定检查顺序

### 3.1 确认远端协议与已有配置

```powershell
git remote -v
git config --show-origin --get core.sshCommand
git config --show-origin --get http.proxy
```

当前 origin 使用 SSH，单独设置 `http.proxy` 不会让 SSH 自动走代理。先检查 `core.sshCommand`，不要反复重试相同的直连命令。

### 3.2 查询系统代理及监听状态

```powershell
Get-ItemProperty 'HKCU:/Software/Microsoft/Windows/CurrentVersion/Internet Settings' |
  Select-Object ProxyEnable, ProxyServer, AutoConfigURL
Get-NetTCPConnection -State Listen -LocalPort 7897
```

`7897` 是本次实测端口，不是所有电脑的固定端口。更换电脑、代理软件或端口后，以系统当前配置和实际监听结果为准；没有监听先检查代理客户端。

### 3.3 通过实测代理验证 HTTPS 连通性

```powershell
curl.exe --proxy http://127.0.0.1:7897 --connect-timeout 8 --max-time 20 --silent --show-error --output NUL --write-out '%{http_code}' https://github.com
```

本次返回 200。通过代理可访问而直连 DNS 失败，说明应修复 Git 使用代理的方式；不要求用户先修复整台机器的 DNS。

### 3.4 验证仓库访问后再执行写操作

```powershell
git ls-remote origin refs/heads/master
```

能返回 master 的提交哈希才说明 Git 网络链路及仓库读取权限正常。`Permission denied (publickey)` 属于 SSH 身份问题，与网络超时不同；继续检查当前已配置的 SSH 身份，不能把它当作 DNS 问题。

## 4. 新克隆或配置丢失时恢复

本地 `.git/config` 不会随提交同步到另一台机器。先确认代理端口、Git 安装路径以及已有 GitHub 主机信任记录，再运行下面已实测的配置方式。Python 的参数数组用于避免 PowerShell 与 Git shell 对空格路径、嵌套引号的重复解析。

```powershell
@'
import shlex
import subprocess

ssh = 'D:/Program Files (x86)/Git/usr/bin/ssh.exe'
proxy = '"D:/Program Files (x86)/Git/mingw32/bin/connect.exe" -H 127.0.0.1:7897 %h %p'
command = shlex.join([
    'env', 'SHELL=/bin/sh', ssh,
    '-o', 'BatchMode=yes',
    '-o', 'StrictHostKeyChecking=yes',
    '-o', 'ConnectTimeout=15',
    '-o', 'ProxyCommand=' + proxy,
])
subprocess.run([
    'git', '-c', 'core.sshCommand=' + command,
    'ls-remote', 'origin', 'refs/heads/master',
], check=True, timeout=40)
subprocess.run(['git', 'config', '--local', 'core.sshCommand', command], check=True)
print('仓库访问验证通过，已保存本仓库 SSH 代理配置')
'@ | python -X utf8 -
```

这段代码先验证访问成功，再保存配置；仍使用原有 SSH 密钥和主机校验，不关闭 TLS 或 SSH 主机身份验证。若是新机器未信任 GitHub 主机，先按官方公布指纹核验，不能用 `StrictHostKeyChecking=no` 绕过。

## 5. 本机已踩过的调用问题

- Git 安装在 `D:/Program Files (x86)/Git`，本次可用的代理辅助程序在 `mingw32/bin/connect.exe`，不是 `mingw64`。不要按常见路径猜。
- Git 自带 SSH 的 ProxyCommand 会经 shell 执行。本机原 shell 环境使其通过 PowerShell 执行 `exec ...`，报 `exec is not recognized`。在 `core.sshCommand` 中加 `env SHELL=/bin/sh` 已解决，只影响该命令的环境。
- 直接让当前 Git 调用 `C:/Windows/System32/OpenSSH/ssh.exe` 实测出现 `No such file or directory`。本方案使用已验证的 Git 自带 SSH，不依赖这条路径。
- 本次保留远端 SSH 443 形式，没有切换远端协议，也没有复制浏览器登录凭据。

## 6. 本次验证记录

- 2026-09-23：系统代理监听核验通过；通过代理访问 GitHub 返回 HTTP 200。
- 2026-09-23：配置 SSH CONNECT 代理后，`git ls-remote origin refs/heads/master` 成功返回远端提交 `dfba57571a67b18a4eeedc3376a90d8d95de88b7`。
- 后续拉取与推送的最终结果以当次命令及 `git ls-remote` 核对为准，不能把本记录中的历史哈希当作永远最新的提交。

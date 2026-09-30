---
name: codebase-design
description: Design deep modules and clean test seams within the Spacetime Java, React, and Taro codebase.
---

Use module, interface, implementation, depth, seam, adapter, leverage, and locality precisely. Preserve the backend Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper layering, keep admin and miniapp independent, and put shared logic in common. Inspect existing seams and tests before introducing new abstractions. Prefer small interfaces, injected dependencies, and behavior tests at public seams.

# Critical areas

## High-risk areas
- Physics equations, constants, units, numerical integration, and simulation stability
- Shared application state, navigation, local-storage formats, and global event handlers
- AI-faculty prompts, model calls, privacy, and cost boundaries
- Camera or hand-tracking inputs and permissions
- Canvas/WebGL rendering loops and resource cleanup
- Authentication, payments, analytics, or production API keys if introduced
- Deployment configuration, `CNAME`, public metadata, and routing
- Global CSS or shared selectors that can affect every experience

Changes in a high-risk area require all of the following before merge:

1. Explain current behavior and ownership boundaries.
2. Propose the smallest modification and list affected files.
3. Describe regression, security, privacy, scientific, and operational risks.
4. Add or update meaningful tests, or document why automation is not currently possible.
5. Run every relevant repository check.
6. Report unexpected side effects considered.
7. Receive explicit human review. Codex must not merge or deploy these changes autonomously.

Scientific changes must name the governing model, units, approximations, valid range, and known limitations. Do not present an approximation as experimental truth.

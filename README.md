# Core

This repository is for core Node.js and Nunjucks utilities, components, and libraries. Including authentication for internal systems, Planning Inspectorate UI components such as the header and footer, and generic error handling middleware.

## Contributing

Commits must follow conventional commits, and the commit types will be used by semantic-release to determine the next version number. For example `feat` commits will result in a minor version bump, while `fix` commits will result in a patch version bump.

The package will be released automatically using semantic-release, on merge to main. This will include a git tag for the release, and publishing to NPM.

# Core

This repository is for core Node.js and Nunjucks utilities, components, and libraries. Including authentication for internal systems, Planning Inspectorate UI components such as the header and footer, and generic error handling middleware.

## Usage

First, install the package:

`npm i --save @planning-inspectorate/core`

Then use as required, there are multiple exports for different parts, as follows:

| Export      | Usage                                                |
|-------------|------------------------------------------------------|
| app         | Service classes and express app creation             |
| controllers | Monitoring controllers                               |
| middleware  | Caching, errors, logging                             |
| redis       | Azure Managed Redis client                           |
| testing     | Test utilities, e.g. TestServer                      |
| ui          | UI components such as the PINS header and footer     |
| util        | Various utilities, such as asyncHanlder and MapCache |

The [template-service](https://github.com/Planning-Inspectorate/template-service) is a good reference for usage. For example, to add monitoring routes to your app:

```typescript
import { createMonitoringRoutes } from '@planning-inspectorate/core/controllers';

/**
 * Main app router
 */
export function buildRouter(service: ManageService): IRouter {
    const router = createRouter();
    const monitoringRoutes = createMonitoringRoutes(service);

    // add monitoring routes for e.g. health endpoint and responding to HEAD requests
    router.use('/', monitoringRoutes);

    // other routes here....

    return router;
}

```

Or to create a `Service` which extends `BaseService`:

```typescript
import { initDatabaseClient } from '@pins/my-service-database';
import type { PrismaClient } from '@pins/my-service-database/src/client/client.ts';
import { BaseService } from '@planning-inspectorate/core/app';
import type { Config } from './config.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class MyService extends BaseService<PrismaClient> {
	constructor(config: Config) {
		super(config, initDatabaseClient);
        // initialise other clients
	}
    
    // other service methods
}

```

## Contributing

Commits must follow conventional commits, and the commit types will be used by semantic-release to determine the next version number. For example `feat` commits will result in a minor version bump, while `fix` commits will result in a patch version bump.

The package will be released automatically using semantic-release, on merge to main. This will include a git tag for the release, and publishing to NPM.

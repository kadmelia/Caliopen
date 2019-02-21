# Continuous Integration (CI)

We have [an instance of drone.io][1] to test the project each time a Pull Request is made on our Github repository.

Which tests are launched depends on the files changed (services modified).

## CI strategy

### Pull Requests

When a pull request is created or a new commit pushed to an already existing PR, Drone captures the event `pull_request`. Depending on the files changed, Drone will launch **lint check, unit tests and functional tests** in the case of the frontend (more info below), or unit tests for python. Go and Python tests are prepared to be launched based on the modifications made to the dependencies of each service, this means a service is only tested if any of its dependencies is modified. Python tests are global and not tied to a service, so the pipeline currently only tests python in case of a modification to the backend. Future improvements include individual service testing and proper unit tests for both go and python.

Those tests are made using the [merge and checkout strategy][2] so the tests will show the results as if the branch was be merged.

### Push

When a branch is merged or commit pushed to `develop`, the event is caught by drone. Every service **modified** is then built and published to the Docker registry. Each Docker image is published with 2 tags: develop and the commit sha. In the case of a merge, only services modified in the merged branch are built. In the case of a direct push, there is no way of checking which files are changed, so every service is built and published.

A push on the `master` branch does not trigger any test nor build.

### Tag

When a ``release-${version}`` tag is created on any branch, Drone will build and publish Docker images with 2 tags: latest and the version of the release. The number of the version is extracted from the tag, stripping the "release-" part.

## Frontend

Using a node container Drone launches the following tests and if one error is encountered it will stop the sequence and return a failure.

1. Lint JS
2. Lint SCSS
3. Unit tests JS
4. Functional tests

### Functional tests

The functional tests release a bundle, start a mocked api (full JS using bouchon cf. devtools/api-mock) and open a socket on [Saucelabs](https://saucelabs.com) that will execute selenium commands on a real browser (Firefox 45/Linux for now). Connection to saucelabs is made through [Sauce-connect][3], which is started as a [Drone service][4].
You can see the full video of the test by browsing open results on the [project account](https://saucelabs.com/open_sauce/user/AllTheDey).

`> Automated tests > CaliOpen e2e - <name of the branch of the PR> > Watch or Metadata > Download video`.

## Drone

### Variables

The following variables are defined as Drone secrets and are not available for non-members of Caliopen, some of them are defined as secrets only to avoid hardcoding them:

* SAUCE_ACCESS_KEY: Saucelabs api key
* SAUCE_USERNAME: Saucelabs username
* SAUCE_ADDRESS: Sauce-connect address, used exclusively by the Frontend, not really a secret

* DOCKER_REGISTRY: Address of the Caliopen docker registry, not a secret either
* DOCKER_USERNAME: Username for the Docker registry
* DOCKER_PASSWORD: Password for the Docker registry

### Pipeline

The Pipeline is divided with commentaries in 5 parts:

1. [**Base images**](https://github.com/CaliOpen/Caliopen/blob/develop/.drone.yml#L14): This section contains the steps that build and publish images used by other services as "Builders". These are images that don't change very often, take some time to compile and contain dependencies shared by many other images. For example, the Python base image compiles the Cassandra driver and the Go base image fetches common govendor packages.
2. [**Tests**](https://github.com/CaliOpen/Caliopen/blob/develop/.drone.yml#L36): This section corresponds to ['Pull requests'](https://github.com/CaliOpen/Caliopen/tree/develop/doc/devops/continuous-integration.md#pull-requests).
3. [**Develop images**](https://github.com/CaliOpen/Caliopen/blob/develop/.drone.yml#L80): This section corresponds to ['Push'](https://github.com/CaliOpen/Caliopen/tree/develop/doc/devops/continuous-integration.md#push). It builds and publishes experimental builds that can be used by developers or for the stage platform.
4. [**Stable images**](https://github.com/CaliOpen/Caliopen/blob/develop/.drone.yml#L274): This section corresponds to ['Tag'](https://github.com/CaliOpen/Caliopen/tree/develop/doc/devops/continuous-integration.md#tag).
4. [**Drone services**](https://github.com/CaliOpen/Caliopen/blob/develop/.drone.yml#L403): Services needed for tests that are started in parallel.

#### Additional info

Develop images are treated differently from release images. Unstable builds are up to date with the develop branch, a branch that changes multiple times per day. To avoid building every service every time a small modification to a single service is made, we check if dependencies for each service have been modified. This logic is integrated in the scripts found in [devtools/drone](https://github.com/CaliOpen/Caliopen/tree/master/devtools/drone). The problem is that scripts cannot be executed with Drone plugins because the entrypoint of the containers cannot be overriden. To circumvent this limitation we use our own unmodified fork of [Drone-Docker](https://github.com/drone-plugins/drone-docker) running in privileged mode.

[1]: https://drone.caliopen.org
[2]: https://github.com/drone-plugins/drone-git/blob/master/plugin.go#L49
[4]: https://github.com/CaliOpen/Caliopen/blob/develop/.drone.yml#L407
[3]: https://wiki.saucelabs.com/display/DOCS/Sauce+Connect+Proxy

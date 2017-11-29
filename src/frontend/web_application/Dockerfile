# This file creates a container that runs a {package} caliopen frontend
# Important:
# Author: Caliopen
# Date: 2016-01-05

FROM node:8
MAINTAINER Caliopen

ADD . /srv/caliopen/frontend/
WORKDIR /srv/caliopen/frontend/
RUN yarn install
RUN yarn run release

EXPOSE 4000

CMD ["yarn", "run", "start:prod"]

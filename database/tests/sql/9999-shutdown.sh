#!/bin/bash

pg_ctl stop -D "$PGDATA" -m fast

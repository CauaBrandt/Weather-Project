#!/bin/bash
PSQL="psql --username=postgres --dbname=weather --no-align --tuples-only -c"

CITY=$($PSQL "SELECT name FROM cities")
if [[ -z $CITY ]]
then
  echo "There is no cities in the database."
else
  echo "Cities: $CITY"
fi
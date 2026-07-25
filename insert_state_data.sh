#!/bin/bash
PSQL="psql -U postgres -d weather -t -A -c"

while IFS=, read COD_UF UF NAME LAT LON REGION
do
    if [[ $NAME != 'nome' ]]
    then
        STATE=$($PSQL "SELECT * FROM states WHERE name = '$NAME'")
        #if [[ -z $STATE ]]
        #then
        #   echo "State already in database!"
        #fi

        ($PSQL "INSERT INTO states(name, region, cod_uf) VALUES('$NAME', '$REGION', $COD_UF)")
    fi
done < estados.csv

echo Finished!

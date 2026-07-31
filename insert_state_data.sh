#!/bin/bash
PSQL="psql -U postgres -d weather -t -A -c"

while IFS=, read COD_UF UF NAME LAT LON REGION
do
    if [[ $NAME != 'nome' ]]
    then
        STATE=$($PSQL "SELECT name FROM states WHERE cod_uf = $COD_UF")
        echo $STATE
        if [[ -n $STATE ]]
        then
            echo "State already in database!"
        else
            $PSQL "INSERT INTO states(name, region, cod_uf) VALUES('$NAME', '$REGION', $COD_UF)"
        fi        
    fi
done < estados.csv

echo Finished!

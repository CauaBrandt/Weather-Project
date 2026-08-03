#!/bin/bash
PSQL="psql -U postgres -d weather -t -A -c"
co
while IFS=, read -r COD_UF UF NAME LAT LON REGION
do
    if [[ "$NAME" != 'nome' ]]
    then
        STATE=$($PSQL "SELECT name FROM states WHERE cod_uf = $COD_UF")
        if [[ -n "$STATE" ]]
        then
            echo "$STATE is already in database!"
        else

            SQL="INSERT INTO states(name, region, cod_uf) VALUES('$NAME', '$REGION', $COD_UF)"
            $PSQL "$SQL"
        fi        
    fi
done < estados.csv

echo Finished!

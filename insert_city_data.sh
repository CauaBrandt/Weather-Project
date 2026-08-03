#!/bin/bash
PSQL="psql -U postgres -d weather -t -A -c"

while IFS=, read COD_IBGE NAME LAT LON CAPITAL COD_UF SIAFI_ID DDD TIMEZONE
do
    if [[ "$NAME" != 'nome' ]]
    then
        STATE_ID=$($PSQL "SELECT state_id FROM states WHERE cod_uf = $COD_UF")

        CITY=$($PSQL "SELECT name FROM cities WHERE latitude = $LAT AND longitude = $LON")
        if [[ -n "$CITY" ]]
        then
            echo "$CITY is already in database!"
        else
            $PSQL "INSERT INTO cities(name, state_id, latitude, longitude, timezone) VALUES('$NAME', $STATE_ID, $LAT, $LON, '$TIMEZONE')"
        fi        
    fi
done < municipios.csv

echo Finished!

import DataBaseService from "../services/dataBaseService";

export const getPointsOfInterest = async (dataBaseService:DataBaseService, latitude:number, longitude:number, radius:number ) => {
    const client = await dataBaseService.connect();
    try{
        const query = `SELECT map_location.location, point_of_interest.*  FROM map_location 
                    INNER JOIN point_of_interest ON map_location.id = point_of_interest.map_location_id
                    WHERE ST_DWithin (location, ST_SetSRID (ST_MakePoint($1, $2), 4326)::geography, $3)
                    ORDER BY map_location.id`;
        const values = [longitude, latitude, radius];
        const { rows } = await client.query(query, values);
        return rows;
    }catch(e){
        console.error('Error fetching points of interest', e);
    }finally{
        client.release();
    }
}

export const addPointsOfInterest = async (dataBaseService:DataBaseService, pointsOfInterest:any[]) => {
    const client = await dataBaseService.connect();
    try{
        await client.query(`BEGIN`);
        for (const pointOfInterest of pointsOfInterest){
            const { latitude, longitude, name, url, address, type, opening_hours, rating, reviews } = pointOfInterest;

            // Check if the point of interest already exists and skip it if it does
            const existingPOI = await client.query(`SELECT id FROM point_of_interest WHERE name = $1 AND address = $2`, [name, address]);
            if (existingPOI.rows.length > 0) continue; 

            let query = `INSERT INTO map_location (location) VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326)) RETURNING id`;
            let values = [longitude, latitude];
            const { rows } = await client.query(query, values);
            const mapLocationId = rows[0].id;
            query = `INSERT INTO point_of_interest (map_location_id, name, url, address, type, opening_hours, rating, reviews) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb) RETURNING *`;
            values = [mapLocationId, name, url, address, type, opening_hours, rating, JSON.stringify(reviews)];
            const result = await client.query(query, values);
        }
        await client.query(`COMMIT`);
        return true;
    }catch(e){
        console.error('Error adding points of interest', e);
    }finally{
        client.release();
    }
}

import express, { Request, Response, NextFunction } from 'express';
import getPointsOfInterest from './controllers/PointsOfInterestController';
import DataBaseService from './services/dataBaseService';

const args = process.argv.slice(2);
const ENVIRONMENT = args[0] === 'dev' ? 'dev' : 'prod';

const dataBaseService = new DataBaseService(ENVIRONMENT);
(async () => {await dataBaseService.init();})();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get(
  '/search',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { location } = req.query;

    //TODO: get latitude and longitude and radius (map zoom) from location
    const latitude = 40.4168;
    const longitude = -3.7038;
    const radius = 5000;

    const getPointsOfInterestResponse = await getPointsOfInterest(dataBaseService, latitude, longitude, radius);
    if(getPointsOfInterestResponse.error){
      res.status(500).json(getPointsOfInterestResponse);
      return;
    }
    res.json(getPointsOfInterestResponse);
  }
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
import dotenv from 'dotenv';
dotenv.config();
import { homeService } from './src/server/services/homeService.ts';

const ownerId = 'aa72bc32-770e-4b6f-b695-6bc8ef16bb67';
homeService.getHomePersonalized(ownerId)
  .then(res => {
    console.log('subscriptionPlan:', res.subscriptionPlan);
    console.log('fomoMessage:', res.dailyInsights?.fomoAlertMessage);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

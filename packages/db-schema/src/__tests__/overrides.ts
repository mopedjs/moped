import StarRating from './overrides/StarRating';
import Food, {FoodID} from './overrides/Food';
import UserI, {UserID} from './overrides/User';

export interface FavouriteFood {
  userID: UserID;
  foodID: FoodID;
  rating: StarRating | null;
}
export {Food};
export type User = UserI;

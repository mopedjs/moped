import StarRating from './StarRating';

export const enum FoodID {}

export default interface Food {
  id: FoodID;
  averageRating: StarRating;
};

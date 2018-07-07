export const enum UserIDBrand {}
export type UserID = {$brand: UserIDBrand} & UserIDBrand;

export default interface User {
  id: UserID;
  profileDocument: {kind: string; content: string}[];
}

import { User } from "./user.struct";


export class ContentInfo {
    id!: number;
    title!: string;
    author!: User;
    img_url!: string;
    tags!: string[];
    like_count!: number;
    created!: string;
    type!: number; // unknown value
}
import { vi } from 'vitest';

const mockPost = vi.fn();
const mockGet = vi.fn();

const mockAxiosInstance = {
    post: mockPost,
    get: mockGet, 
};

export default mockAxiosInstance; 

export const post = mockPost;
export const get = mockGet;
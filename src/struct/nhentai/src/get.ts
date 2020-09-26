import axios from 'axios';

export default async (url: string) => await axios.get(url, { validateStatus: () => true });

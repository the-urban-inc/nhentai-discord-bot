import axios, { AxiosResponse } from 'axios';

/**
 * Scrapes the website that the url leads to
 *
 * @param url The url to scrape
 * @returns The raw data as an AxiosResponse
 */
export async function get(url: string): Promise<AxiosResponse<any>> {
    return await axios.get(url, { validateStatus: () => true });
}

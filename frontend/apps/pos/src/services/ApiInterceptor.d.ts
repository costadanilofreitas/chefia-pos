import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
export interface TokenData {
    access_token: string;
    token_type: string;
    expires_in: number;
    operator_id: string;
    operator_name: string;
    roles: string[];
    permissions: string[];
    require_password_change: boolean;
}
export declare class ApiInterceptor {
    private static instance;
    private axiosInstance;
    private tokenData;
    private tokenExpirationTime;
    private refreshPromise;
    private constructor();
    static getInstance(): ApiInterceptor;
    getAxiosInstance(): AxiosInstance;
    private setupRequestInterceptor;
    private setupResponseInterceptor;
    setToken(tokenData: TokenData | string): void;
    getToken(): TokenData | null;
    clearToken(): void;
    isTokenValid(): boolean;
    getTokenExpirationTime(): number;
    private refreshToken;
    private performTokenRefresh;
    private saveTokenToStorage;
    private loadTokenFromStorage;
    request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
}
export declare const apiInterceptor: ApiInterceptor;
export default apiInterceptor;

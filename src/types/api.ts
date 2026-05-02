export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

export interface RpcLoginResponse {
  id: string;
  role_id: string | null;
}

interface responseInterface {
  success?: boolean
  status: number;
  message: string;
  type?: string;
  data?: any;
  token?: any;
  pagination?: any;
}

export default (response: responseInterface) => {
  const { success = true, status, message, data = {}, type, token, pagination } = response;

  return {
    success: success || status >= 200 && status <= 300,
    status,
    message,
    response: {
      ...(type && { type }),
      data,
      ...(token && { tokens: token }),
      ...(pagination && { pagination }),
    },
  };
};

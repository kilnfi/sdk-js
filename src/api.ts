import axios from "axios";

export const api = axios.create();
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.log(err);
    throw new Error(err.response.data.message);
  },
);

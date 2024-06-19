import axios from "axios";

const api = axios.create({});
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.log(err);
    throw new Error(err.response.data.message);
  },
);

export default api;

import axios from 'axios';

const api = axios.create({
  baseURL: 'https://rewear-sjfp.onrender.com/api',
});

export default api;

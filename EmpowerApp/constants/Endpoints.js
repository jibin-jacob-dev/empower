import { Platform } from 'react-native';

const API_URL = 'http://192.168.20.4:5203/api';

export const Endpoints = {
    Login: `${API_URL}/Auth/login`,
    Register: `${API_URL}/Auth/register`,
    Profile: `${API_URL}/Profile`,
    UploadImage: `${API_URL}/Profile/upload-image`,
    Products: `${API_URL}/Products`,
    Trainings: `${API_URL}/Trainings`,
    Categories: `${API_URL}/Categories`
};

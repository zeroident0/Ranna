import { Redirect } from 'expo-router';
import React from 'react';

const index = () => {
  return <Redirect href="/(home)/(tabs)" />;
};

export default index;

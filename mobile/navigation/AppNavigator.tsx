import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import AlertScreen from "../screens/AlertScreen";
import EmergencyContactsScreen from "../screens/EmergencyContactsScreen";
import AddContactScreen from "../screens/AddContactScreen";
import AssistantSheet from "../components/AssistantSheet";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Alert" component={AlertScreen} />
        <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
        <Stack.Screen name="AddContact" component={AddContactScreen} />

        {/* Assistant as its own screen */}
        <Stack.Screen name="Assistant" component={AssistantSheet} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
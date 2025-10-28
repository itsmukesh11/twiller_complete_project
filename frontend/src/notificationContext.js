import React from "react";

const NotificationContext = React.createContext({
  enabled: true,
  setEnabled: () => {}
});

export default NotificationContext;

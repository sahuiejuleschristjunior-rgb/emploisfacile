import { createContext, useContext, useMemo, useState } from "react";

const ActiveConversationContext = createContext(null);

export function ActiveConversationProvider({ children }) {
  const [activeConversationId, setActiveConversationId] = useState(null);

  const value = useMemo(
    () => ({ activeConversationId, setActiveConversationId }),
    [activeConversationId]
  );

  return (
    <ActiveConversationContext.Provider value={value}>
      {children}
    </ActiveConversationContext.Provider>
  );
}

export function useActiveConversation() {
  return useContext(ActiveConversationContext);
}

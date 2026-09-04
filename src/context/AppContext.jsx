// FILE: src/context/AppContext.jsx
// eLogix HRMS - App Context (standalone, no circular imports)
import { createContext, useContext } from 'react'
export const AppContext = createContext(null)
export function useApp() {
  const ctx = useContext(AppContext)
  return ctx || {
    sub:'', navTo:()=>{}, persona:'employee', switchPersona:()=>{},
    currentPersona:{id:'employee',label:'Employee',icon:'👤',color:'#64748b'},
    lang:'en', currency:'NPR', company:null, user:null,
    showNotif:false, setShowNotif:()=>{}, showAI:false, setShowAI:()=>{},
    sidebarOpen:true, setSidebarOpen:()=>{},
  }
}
export default AppContext

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import './assets/style.css'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { 
  faHeart, faUser, faSpinner, 
  faCartShopping, faBars, faXmark 
} from '@fortawesome/free-solid-svg-icons'
import i18n from './i18n/i18n'
import setupAxios from './plugins/axios'


library.add(faUser, faHeart, faCartShopping, faXmark, faBars, faSpinner)


const app = createApp(App)
const pinia = createPinia()


pinia.use(piniaPluginPersistedstate)

app.component('font-awesome-icon', FontAwesomeIcon)

app.use(pinia)  
app.use(router) 
app.use(i18n)   

setupAxios()

app.mount('#app')
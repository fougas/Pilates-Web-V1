import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
  ScrollView,
} from 'react-native-web';
import { Calendar } from "react-native-calendars/web";
import { LinearGradient } from "expo-linear-gradient/web";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { styles } from './styles.js';

// Remplacer Alert par une version web
const Alert = {
  alert: (title, message) => {
    window.alert(`${title}\n${message}`);
  }
};

// Configuration Firebase
const firebaseConfig = {
  // Vos configurations Firebase
  apiKey: "AIzaSyCI7Ajf_9i7LRXeEOxxtNnF5S-x88KgvDw",
  authDomain: "pilates-ee95b.firebaseapp.com",
  projectId: "pilates-ee95b",
  storageBucket: "pilates-ee95b.appspot.com",
  messagingSenderId: "406434228854",
  appId: "1:406434228854:web:d7eace586a578698accd57",
  measurementId: "G-53NS286B1Z",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Composant Button personnalisé pour le web
const Button = ({ onPress, title, color = '#2196F3' }) => (
  <TouchableOpacity
    style={{
      backgroundColor: color,
      padding: 10,
      borderRadius: 5,
      margin: 5,
      cursor: 'pointer',
    }}
    onPress={onPress}
  >
    <Text style={{ color: 'white', textAlign: 'center' }}>
      {title}
    </Text>
  </TouchableOpacity>
);

export default function App() {
  // États modifiés pour le web
  const [appState, setAppState] = useState({
    isLoggedIn: false,
    isAdmin: false,
    currentUser: null,
    selectedDate: "",
    isLoading: false,
    error: null,
  });

  // États des modals et formulaires
  const [modalState, setModalState] = useState({
    userModal: false,
    classModal: false,
    enrolledModal: false,
  });

  const [formState, setFormState] = useState({
    login: {
      username: "",
      password: "",
    },
    newUser: {
      username: "",
      password: "",
      isAdmin: false,
    },
    newClass: {
      name: "",
      time: "",
      duration: "",
      capacity: "",
    },
  });

  // États pour les données
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState({});
  const [selectedClass, setSelectedClass] = useState(null);

  // useEffect pour l'initialisation
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);

        if (snapshot.empty) {
          console.log("Création des utilisateurs par défaut");
          await addDoc(usersRef, {
            username: "admin",
            password: "admin123",
            isAdmin: true,
          });

          await addDoc(usersRef, {
            username: "user",
            password: "password",
            isAdmin: false,
          });

          const newSnapshot = await getDocs(usersRef);
          const usersList = newSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setUsers(usersList);
        } else {
          console.log("Chargement des utilisateurs existants");
          const usersList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setUsers(usersList);
        }

        if (appState.selectedDate) {
          await loadClasses(appState.selectedDate);
        }
      } catch (error) {
        console.error("Erreur d'initialisation:", error);
        Alert.alert("Erreur", "Erreur lors de l'initialisation");
      }
    };

    initializeApp();
  }, [appState.selectedDate]);

  // Gestion de la connexion adaptée pour le web
  const handleLogin = async () => {
    try {
      setAppState(prev => ({ ...prev, isLoading: true }));
      const user = users.find(
        u => u.username === formState.login.username && 
            u.password === formState.login.password
      );

      if (user) {
        setAppState(prev => ({
          ...prev,
          isLoggedIn: true,
          isAdmin: user.isAdmin,
          currentUser: user,
          isLoading: false,
        }));
        setFormState(prev => ({
          ...prev,
          login: { username: "", password: "" }
        }));
        
        // Stockage local pour PWA
        localStorage.setItem('currentUser', JSON.stringify(user));
      } else {
        throw new Error("Identifiants incorrects");
      }
    } catch (error) {
      setAppState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
      Alert.alert("Erreur", error.message);
    }
  };

  // Déconnexion adaptée pour le web
  const handleLogout = () => {
    setAppState(prev => ({
      ...prev,
      isLoggedIn: false,
      isAdmin: false,
      currentUser: null,
    }));
    localStorage.removeItem('currentUser');
  };
// Gestion des utilisateurs
  const addUser = async () => {
    try {
      if (!formState.newUser.username || !formState.newUser.password) {
        Alert.alert("Erreur", "Veuillez remplir tous les champs");
        return;
      }

      const usersRef = collection(db, "users");
      await addDoc(usersRef, formState.newUser);
      
      // Rafraîchir la liste des utilisateurs
      const snapshot = await getDocs(usersRef);
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
      
      setFormState(prev => ({
        ...prev,
        newUser: { username: "", password: "", isAdmin: false }
      }));
      setModalState(prev => ({ ...prev, userModal: false }));
      
      Alert.alert("Succès", "Utilisateur ajouté avec succès");
    } catch (error) {
      Alert.alert("Erreur", "Erreur lors de l'ajout de l'utilisateur");
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
      try {
        await deleteDoc(doc(db, "users", userId));
        setUsers(prev => prev.filter(user => user.id !== userId));
        Alert.alert("Succès", "Utilisateur supprimé");
      } catch (error) {
        Alert.alert("Erreur", "Erreur lors de la suppression");
      }
    }
  };

  // Gestion des cours
  const loadClasses = async (date) => {
    try {
      const classesRef = collection(db, "classes");
      const snapshot = await getDocs(classesRef);
      const classesData = {};
      
      snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .forEach(classItem => {
          if (classItem.date === date) {
            if (!classesData[date]) {
              classesData[date] = [];
            }
            classesData[date].push(classItem);
          }
        });
      
      setClasses(classesData);
    } catch (error) {
      Alert.alert("Erreur", "Erreur lors du chargement des cours");
    }
  };

  const addClass = async () => {
    try {
      if (!formState.newClass.name || !formState.newClass.time || 
          !formState.newClass.duration || !formState.newClass.capacity) {
        Alert.alert("Erreur", "Veuillez remplir tous les champs");
        return;
      }

      const classesRef = collection(db, "classes");
      const newClassItem = {
        ...formState.newClass,
        date: appState.selectedDate,
        enrolled: [],
        status: "Disponible",
        capacity: parseInt(formState.newClass.capacity)
      };
      
      await addDoc(classesRef, newClassItem);
      await loadClasses(appState.selectedDate);
      
      setFormState(prev => ({
        ...prev,
        newClass: { name: "", time: "", duration: "", capacity: "" }
      }));
      setModalState(prev => ({ ...prev, classModal: false }));
      
      Alert.alert("Succès", "Cours ajouté avec succès");
    } catch (error) {
      Alert.alert("Erreur", "Erreur lors de l'ajout du cours");
    }
  };

  const deleteClass = async (classId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce cours ?")) {
      try {
        await deleteDoc(doc(db, "classes", classId));
        await loadClasses(appState.selectedDate);
        Alert.alert("Succès", "Cours supprimé");
      } catch (error) {
        Alert.alert("Erreur", "Erreur lors de la suppression");
      }
    }
  };

  const handleReservation = async (classItem) => {
    try {
      if (classItem.enrolled.includes(appState.currentUser.id)) {
        Alert.alert("Erreur", "Vous êtes déjà inscrit à ce cours");
        return;
      }

      if (classItem.enrolled.length >= classItem.capacity) {
        Alert.alert("Erreur", "Ce cours est complet");
        return;
      }

      const classRef = doc(db, "classes", classItem.id);
      const updatedEnrolled = [...classItem.enrolled, appState.currentUser.id];
      
      await updateDoc(classRef, {
        enrolled: updatedEnrolled,
        status: updateClassStatus({ ...classItem, enrolled: updatedEnrolled })
      });
      
      await loadClasses(appState.selectedDate);
      Alert.alert("Succès", "Réservation effectuée");
    } catch (error) {
      Alert.alert("Erreur", "Erreur lors de la réservation");
    }
  };

  const updateClassStatus = (classItem) => {
    if (classItem.enrolled.length >= classItem.capacity) {
      return "Complet";
    } else if (classItem.enrolled.length >= classItem.capacity * 0.8) {
      return "Presque complet";
    }
    return "Disponible";
  };
  // Composants de rendu
  const renderClass = ({ item }) => (
    <div className="class-item" style={styles.classItem}>
      <h3 style={styles.className}>{item.name}</h3>
      <p style={styles.classInfo}>
        {item.time} - {item.duration}
      </p>
      <p style={styles.classInfo}>
        Places: {item.enrolled.length}/{item.capacity}
      </p>
      <p style={{
        ...styles.classStatus,
        color: item.status === 'Complet' ? 'red' : 
               item.status === 'Presque complet' ? 'orange' : 'green'
      }}>
        {item.status}
      </p>
      {appState.isAdmin ? (
        <div style={styles.buttonContainer}>
          <Button
            title="Voir inscrits"
            onPress={() => {
              setSelectedClass(item);
              setModalState(prev => ({ ...prev, enrolledModal: true }));
            }}
          />
          <Button
            title="Supprimer"
            color="#FF4B2B"
            onPress={() => deleteClass(item.id)}
          />
        </div>
      ) : (
        <Button
          title="Réserver"
          onPress={() => handleReservation(item)}
          color={item.enrolled.length >= item.capacity ? '#ccc' : '#4CAF50'}
          disabled={item.enrolled.length >= item.capacity}
        />
      )}
    </div>
  );

  // Rendu principal
  if (!appState.isLoggedIn) {
    return (
      <LinearGradient
        colors={['#FFA500', '#B0E2FF']}
        style={styles.container}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
      >
        <View style={styles.loginContainer}>
          <h1 style={styles.appTitle}>Pilates App</h1>
          <View style={styles.loginForm}>
            <TextInput
              style={styles.input}
              placeholder="Nom d'utilisateur"
              value={formState.login.username}
              onChange={e => setFormState(prev => ({
                ...prev,
                login: { ...prev.login, username: e.target.value }
              }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              type="password"
              value={formState.login.password}
              onChange={e => setFormState(prev => ({
                ...prev,
                login: { ...prev.login, password: e.target.value }
              }))}
            />
            <Button
              title="Se connecter"
              onPress={handleLogin}
            />
          </View>
        </View>
      </LinearGradient>
    );
  }

  // Interface principale
  return (
    <LinearGradient
      colors={['#FFA500', '#B0E2FF']}
      style={styles.container}
      start={{ x: 0, y: 1 }}
      end={{ x: 0, y: 0 }}
    >
      <View style={styles.mainContainer}>
        <h1 style={styles.centeredHeader}>
          {appState.isAdmin ? "Panneau d'administration" : "Cours de Pilates"}
        </h1>

        {appState.isAdmin && (
          <div style={styles.adminSection}>
            <Button
              title="Ajouter un utilisateur"
              onPress={() => setModalState(prev => ({ ...prev, userModal: true }))}
            />
            <div style={styles.usersList}>
              {users.map(user => (
                <div key={user.id} style={styles.userItem}>
                  <span>{user.username} - {user.isAdmin ? "Admin" : "User"}</span>
                  <Button
                    title="Supprimer"
                    onPress={() => deleteUser(user.id)}
                    color="#FF4B2B"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <Calendar
          style={styles.calendar}
          onDayPress={day => {
            setAppState(prev => ({ ...prev, selectedDate: day.dateString }));
          }}
          markedDates={{
            [appState.selectedDate]: { selected: true, selectedColor: '#FFA500' }
          }}
          theme={{
            todayTextColor: '#FFA500',
            selectedDayBackgroundColor: '#FFA500',
            arrowColor: '#FFA500',
          }}
        />

        {appState.isAdmin && (
          <Button
            title="Ajouter un cours"
            onPress={() => setModalState(prev => ({ ...prev, classModal: true }))}
          />
        )}

        <div style={styles.classesList}>
          {classes[appState.selectedDate]?.map(item => renderClass({ item }))}
        </div>

        <Button
          title="Se déconnecter"
          onPress={handleLogout}
          color="#FF4B2B"
        />
      </View>

      {/* Modals */}
      {/* Modal d'ajout d'utilisateur */}
      {modalState.userModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Ajouter un utilisateur</h2>
            <TextInput
              style={styles.input}
              placeholder="Nom d'utilisateur"
              value={formState.newUser.username}
              onChange={e => setFormState(prev => ({
                ...prev,
                newUser: { ...prev.newUser, username: e.target.value }
              }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              type="password"
              value={formState.newUser.password}
              onChange={e => setFormState(prev => ({
                ...prev,
                newUser: { ...prev.newUser, password: e.target.value }
              }))}
            />
            <div style={styles.checkboxContainer}>
              <label>
                <input
                  type="checkbox"
                  checked={formState.newUser.isAdmin}
                  onChange={e => setFormState(prev => ({
                    ...prev,
                    newUser: { ...prev.newUser, isAdmin: e.target.checked }
                  }))}
                />
                Admin
              </label>
            </div>
            <div style={styles.modalButtons}>
              <Button title="Ajouter" onPress={addUser} />
              <Button
                title="Annuler"
                onPress={() => setModalState(prev => ({ ...prev, userModal: false }))}
                color="#FF4B2B"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal des inscrits */}
      {modalState.enrolledModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>
              Inscrits au cours {selectedClass?.name}
            </h2>
            <div style={styles.enrolledList}>
              {users
                .filter(u => selectedClass?.enrolled.includes(u.id))
                .map(user => (
                  <div key={user.id} style={styles.enrolledItem}>
                    {user.username}
                  </div>
                ))}
            </div>
            <Button
              title="Fermer"
              onPress={() => setModalState(prev => ({ ...prev, enrolledModal: false }))}
            />
          </div>
        </div>
      )}

      {/* Modal d'ajout de cours */}
      {modalState.classModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Ajouter un cours</h2>
            <TextInput
              style={styles.input}
              placeholder="Nom du cours"
              value={formState.newClass.name}
              onChange={e => setFormState(prev => ({
                ...prev,
                newClass: { ...prev.newClass, name: e.target.value }
              }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Heure (ex: 10:00)"
              value={formState.newClass.time}
              onChange={e => setFormState(prev => ({
                ...prev,
                newClass: { ...prev.newClass, time: e.target.value }
              }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Durée (ex: 60 min)"
              value={formState.newClass.duration}
              onChange={e => setFormState(prev => ({
                ...prev,
                newClass: { ...prev.newClass, duration: e.target.value }
              }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Capacité"
              value={formState.newClass.capacity}
              onChange={e => setFormState(prev => ({
                ...prev,
                newClass: { ...prev.newClass, capacity: e.target.value }
              }))}
              type="number"
            />
            <div style={styles.modalButtons}>
              <Button title="Ajouter" onPress={addClass} />
              <Button
                title="Annuler"
                onPress={() => setModalState(prev => ({ ...prev, classModal: false }))}
                color="#FF4B2B"
              />
            </div>
          </div>
        </div>
      )}
    </LinearGradient>
  );
}
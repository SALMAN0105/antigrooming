import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ConnectChild from './pages/ConnectChild';
import ChildList from './pages/ChildList';
import IncidentList from './pages/IncidentList';
import IncidentDetail from './pages/IncidentDetail';
import Layout from './components/Layout';

export default function MainRouter() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/connect" element={<ConnectChild />} />
                <Route path="/children" element={<ChildList />} />
                <Route path="/incidents" element={<IncidentList />} />
                <Route path="/incidents/:id" element={<IncidentDetail />} />
            </Route>
        </Routes>
    );
}

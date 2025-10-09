import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ContasPagar from "./pages/Financeiro/ContasPagar";
import ContasReceber from "./pages/Financeiro/ContasReceber";
import FluxoCaixa from "./pages/Financeiro/FluxoCaixa";
import Clientes from "./pages/Cadastros/Clientes";
import Fornecedores from "./pages/Cadastros/Fornecedores";
import Servicos from "./pages/Cadastros/Servicos";
import CentroCustos from "./pages/Cadastros/CentroCustos";
import Categorias from "./pages/Cadastros/Categorias";
import Bancos from "./pages/Financeiro/Bancos";
import Configuracoes from "./pages/Configuracoes/Index";
import Usuarios from "./pages/Usuarios/Index";
import NotaFiscal from "./pages/NotaFiscal";
import Relatorios from "./pages/Relatorios";
import Planos from "./pages/Planos";
import Faturamento from "./pages/Faturamento";
import PopulateDemoData from "./pages/PopulateDemoData";
import Layout from "./components/Layout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="nexerp-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/faturamento" element={
              <ProtectedRoute>
                <Layout><Faturamento /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/financeiro/contas-pagar" element={
              <ProtectedRoute>
                <Layout><ContasPagar /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/financeiro/contas-receber" element={
              <ProtectedRoute>
                <Layout><ContasReceber /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/financeiro/fluxo-caixa" element={
              <ProtectedRoute>
                <Layout><FluxoCaixa /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/cadastros/clientes" element={
              <ProtectedRoute>
                <Layout><Clientes /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/cadastros/fornecedores" element={
              <ProtectedRoute>
                <Layout><Fornecedores /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/cadastros/servicos" element={
              <ProtectedRoute>
                <Layout><Servicos /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/cadastros/centro-custos" element={
              <ProtectedRoute>
                <Layout><CentroCustos /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/cadastros/categorias" element={
              <ProtectedRoute>
                <Layout><Categorias /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/financeiro/bancos" element={
              <ProtectedRoute>
                <Layout><Bancos /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/configuracoes" element={
              <ProtectedRoute>
                <Layout><Configuracoes /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/nota-fiscal" element={
              <ProtectedRoute>
                <Layout><NotaFiscal /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/relatorios" element={
              <ProtectedRoute>
                <Layout><Relatorios /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/usuarios" element={
              <ProtectedRoute>
                <Layout><Usuarios /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/planos" element={
              <ProtectedRoute>
                <Layout><Planos /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/populate-demo" element={
              <ProtectedRoute>
                <Layout><PopulateDemoData /></Layout>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </ThemeProvider>
</QueryClientProvider>
);

export default App;

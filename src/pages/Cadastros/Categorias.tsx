import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Edit, Trash2, Tag, Palette, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  status: 'active' | 'inactive' | 'pending';
  type: 'revenue' | 'expense';
  created_at: string;
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  description: string;
  color: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  category_name?: string;
}

const Categorias = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [activeTab, setActiveTab] = useState('categories');
  const { toast } = useToast();
  
  // Hook para modal de confirmação
  const confirmDialog = useConfirmDialog();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    type: 'expense' as 'revenue' | 'expense',
  });

  const [subFormData, setSubFormData] = useState({
    name: '',
    description: '',
    color: '#6B7280',
    category_id: '',
  });

  const colorOptions = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Usuário não está vinculado a uma empresa",
          variant: "destructive",
        });
        return;
      }

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories((categoriesData || []) as Category[]);

      // Fetch subcategories with category names
      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('subcategories')
        .select(`
          *,
          categories!inner(name)
        `)
        .eq('company_id', profile.company_id)
        .order('name');

      if (subcategoriesError) throw subcategoriesError;
      
      const formattedSubcategories = subcategoriesData?.map(sub => ({
        ...sub,
        category_name: sub.categories?.name || 'Categoria não encontrada'
      })) || [];
      
      setSubcategories(formattedSubcategories);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as categorias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      type: 'expense',
    });
    setEditingCategory(null);
  };

  const resetSubForm = () => {
    setSubFormData({
      name: '',
      description: '',
      color: '#6B7280',
      category_id: '',
    });
    setEditingSubcategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Usuário não está vinculado a uma empresa",
          variant: "destructive",
        });
        return;
      }

      const categoryData = {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        type: formData.type,
        company_id: profile.company_id,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;

        toast({
          title: "Categoria atualizada!",
          description: "As informações foram atualizadas com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([categoryData]);

        if (error) throw error;

        toast({
          title: "Categoria cadastrada!",
          description: "A nova categoria foi adicionada com sucesso.",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as informações",
        variant: "destructive",
      });
    }
  };

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Usuário não está vinculado a uma empresa",
          variant: "destructive",
        });
        return;
      }

      const subcategoryData = {
        name: subFormData.name,
        description: subFormData.description,
        color: subFormData.color,
        category_id: subFormData.category_id,
        company_id: profile.company_id,
      };

      if (editingSubcategory) {
        const { error } = await supabase
          .from('subcategories')
          .update(subcategoryData)
          .eq('id', editingSubcategory.id);

        if (error) throw error;

        toast({
          title: "Subcategoria atualizada!",
          description: "As informações foram atualizadas com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('subcategories')
          .insert([subcategoryData]);

        if (error) throw error;

        toast({
          title: "Subcategoria cadastrada!",
          description: "A nova subcategoria foi adicionada com sucesso.",
        });
      }

      setSubDialogOpen(false);
      resetSubForm();
      fetchData();
    } catch (error) {
      console.error('Error saving subcategory:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as informações",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#3B82F6',
      type: category.type || 'expense',
    });
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const handleEditSub = (subcategory: Subcategory) => {
    setSubFormData({
      name: subcategory.name,
      description: subcategory.description || '',
      color: subcategory.color || '#6B7280',
      category_id: subcategory.category_id,
    });
    setEditingSubcategory(subcategory);
    setSubDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Categoria excluída!",
        description: "A categoria foi removida com sucesso.",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a categoria",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSub = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta subcategoria?')) return;

    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Subcategoria excluída!",
        description: "A subcategoria foi removida com sucesso.",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a subcategoria",
        variant: "destructive",
      });
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSubcategories = subcategories.filter(subcategory =>
    subcategory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subcategory.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subcategory.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separar categorias por tipo
  const revenueCategories = filteredCategories.filter(cat => cat.type === 'revenue');
  const expenseCategories = filteredCategories.filter(cat => cat.type === 'expense');

  // Group subcategories by category
  const categoriesWithSubcategories = (categoryList: Category[]) => categoryList.map(category => ({
    ...category,
    subcategories: subcategories.filter(sub => sub.category_id === category.id)
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground">Gerencie as categorias e subcategorias de produtos e serviços</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Categoria
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetSubForm} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Nova Subcategoria
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Category Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategory ? 'Atualize as informações' : 'Preencha as informações da nova categoria'}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: 'revenue' | 'expense') => setFormData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Receita</SelectItem>
                        <SelectItem value="expense">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">Cor</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="color"
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="w-20 h-10"
                      />
                      <div className="flex space-x-1">
                        {colorOptions.map(color => (
                          <button
                            key={color}
                            type="button"
                            className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500"
                            style={{ backgroundColor: color }}
                            onClick={() => setFormData(prev => ({ ...prev, color }))}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingCategory ? 'Atualizar' : 'Salvar'}
                    </Button>
                  </div>
                </form>
        </DialogContent>
      </Dialog>

      {/* Subcategory Dialog */}
      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
        <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingSubcategory ? 'Editar Subcategoria' : 'Nova Subcategoria'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingSubcategory ? 'Atualize as informações' : 'Preencha as informações da nova subcategoria'}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category_id">Categoria Principal *</Label>
                    <Select value={subFormData.category_id} onValueChange={(value) => setSubFormData(prev => ({ ...prev, category_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: category.color || '#3B82F6' }}
                              />
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sub_name">Nome *</Label>
                    <Input
                      id="sub_name"
                      value={subFormData.name}
                      onChange={(e) => setSubFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sub_description">Descrição</Label>
                    <Textarea
                      id="sub_description"
                      value={subFormData.description}
                      onChange={(e) => setSubFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sub_color">Cor</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="sub_color"
                        type="color"
                        value={subFormData.color}
                        onChange={(e) => setSubFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="w-20 h-10"
                      />
                      <div className="flex space-x-1">
                        {colorOptions.map(color => (
                          <button
                            key={color}
                            type="button"
                            className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500"
                            style={{ backgroundColor: color }}
                            onClick={() => setSubFormData(prev => ({ ...prev, color }))}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setSubDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingSubcategory ? 'Atualizar' : 'Salvar'}
                    </Button>
                  </div>
                </form>
        </DialogContent>
      </Dialog>

      {/* Categories with Subcategories - Separated by Type */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="revenue" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Categorias de Receita ({revenueCategories.length})
          </TabsTrigger>
          <TabsTrigger value="expense" className="gap-2">
            <TrendingDown className="h-4 w-4" />
            Categorias de Despesa ({expenseCategories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : revenueCategories.length === 0 ? (
            <Card>
              <CardContent className="text-center py-10">
                <Tag className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">Nenhuma categoria de receita encontrada</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Comece cadastrando categorias de receita para sua empresa.
                </p>
              </CardContent>
            </Card>
          ) : (
            categoriesWithSubcategories(revenueCategories).map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                   <div className="flex items-center space-x-3">
                    <div 
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: category.color || '#3B82F6' }}
                    />
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {category.description && (
                          <CardDescription>{category.description}</CardDescription>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {category.type === 'revenue' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={category.status === 'active' ? 'default' : 'secondary'}>
                      {category.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {category.subcategories.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Subcategorias:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {category.subcategories.map((subcategory) => (
                        <div 
                          key={subcategory.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center space-x-2 flex-1">
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: subcategory.color || '#6B7280' }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{subcategory.name}</p>
                              {subcategory.description && (
                                <p className="text-xs text-muted-foreground truncate">{subcategory.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <Badge 
                              variant={subcategory.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {subcategory.status === 'active' ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSub(subcategory)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSub(subcategory.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
        </TabsContent>

        <TabsContent value="expense" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : expenseCategories.length === 0 ? (
            <Card>
              <CardContent className="text-center py-10">
                <Tag className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">Nenhuma categoria de despesa encontrada</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Comece cadastrando categorias de despesa para sua empresa.
                </p>
              </CardContent>
            </Card>
          ) : (
            categoriesWithSubcategories(expenseCategories).map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: category.color || '#3B82F6' }}
                    />
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {category.description && (
                          <CardDescription>{category.description}</CardDescription>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {category.type === 'revenue' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={category.status === 'active' ? 'default' : 'secondary'}>
                      {category.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {category.subcategories && category.subcategories.length > 0 && (
                <CardContent>
                  <div className="border rounded-lg">
                    <div className="bg-muted/50 px-4 py-2 border-b">
                      <p className="text-sm font-medium">Subcategorias ({category.subcategories.length})</p>
                    </div>
                    <div className="divide-y">
                      {category.subcategories.map((subcategory) => (
                        <div key={subcategory.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div 
                              className="w-4 h-4 rounded-full border flex-shrink-0"
                              style={{ backgroundColor: subcategory.color || '#6B7280' }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{subcategory.name}</p>
                              {subcategory.description && (
                                <p className="text-xs text-muted-foreground truncate">{subcategory.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <Badge 
                              variant={subcategory.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {subcategory.status === 'active' ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSub(subcategory)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSub(subcategory.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
        </TabsContent>
      </Tabs>

      {/* Modal de confirmação para exclusão */}
      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={confirmDialog.handleClose}
        title={confirmDialog.options.title}
        description={confirmDialog.options.description}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        variant={confirmDialog.options.variant}
        onConfirm={confirmDialog.handleConfirm}
      />
    </div>
  );
};

export default Categorias;
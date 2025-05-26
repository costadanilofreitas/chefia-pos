import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Paragraph, Button, Divider, ActivityIndicator, Chip, TextInput, FAB, Portal, Dialog } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useSync } from '../contexts/SyncContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Tipos
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
  popular: boolean;
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  allergens?: string[];
}

interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
}

// Dados de exemplo
const MOCK_CATEGORIES: Category[] = [
  { id: '1', name: 'Lanches', description: 'Hambúrgueres, sanduíches e mais' },
  { id: '2', name: 'Acompanhamentos', description: 'Batatas fritas, onion rings e mais' },
  { id: '3', name: 'Bebidas', description: 'Refrigerantes, sucos e mais' },
  { id: '4', name: 'Sobremesas', description: 'Sorvetes, tortas e mais' },
];

const MOCK_MENU_ITEMS: MenuItem[] = [
  {
    id: '1',
    name: 'X-Burger',
    description: 'Hambúrguer de carne bovina, queijo, alface, tomate e maionese',
    price: 25.90,
    category: '1',
    available: true,
    popular: true,
    nutritionalInfo: {
      calories: 650,
      protein: 35,
      carbs: 40,
      fat: 38
    },
    allergens: ['glúten', 'laticínios']
  },
  {
    id: '2',
    name: 'X-Bacon',
    description: 'Hambúrguer de carne bovina, queijo, bacon, alface, tomate e maionese',
    price: 28.90,
    category: '1',
    available: true,
    popular: true,
    nutritionalInfo: {
      calories: 750,
      protein: 40,
      carbs: 40,
      fat: 45
    },
    allergens: ['glúten', 'laticínios']
  },
  {
    id: '3',
    name: 'Batata Frita',
    description: 'Porção de batatas fritas crocantes',
    price: 15.90,
    category: '2',
    available: true,
    popular: true,
    nutritionalInfo: {
      calories: 450,
      protein: 5,
      carbs: 60,
      fat: 22
    },
    allergens: []
  },
  {
    id: '4',
    name: 'Onion Rings',
    description: 'Anéis de cebola empanados e fritos',
    price: 18.90,
    category: '2',
    available: true,
    popular: false,
    nutritionalInfo: {
      calories: 500,
      protein: 6,
      carbs: 65,
      fat: 25
    },
    allergens: ['glúten']
  },
  {
    id: '5',
    name: 'Refrigerante',
    description: 'Coca-Cola, Guaraná ou Sprite (lata 350ml)',
    price: 8.90,
    category: '3',
    available: true,
    popular: false
  },
  {
    id: '6',
    name: 'Suco Natural',
    description: 'Laranja, abacaxi ou maracujá (copo 300ml)',
    price: 12.90,
    category: '3',
    available: true,
    popular: false
  },
  {
    id: '7',
    name: 'Sorvete',
    description: 'Baunilha, chocolate ou morango (2 bolas)',
    price: 14.90,
    category: '4',
    available: true,
    popular: true,
    nutritionalInfo: {
      calories: 350,
      protein: 5,
      carbs: 45,
      fat: 18
    },
    allergens: ['laticínios']
  },
];

const MenuScreen = ({ navigation, route }: any) => {
  const { isOnline } = useSync();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNutritionalInfo, setShowNutritionalInfo] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  
  // Carregar categorias e itens do menu
  useEffect(() => {
    const loadMenu = async () => {
      try {
        // Em produção, isso seria uma chamada API real
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCategories(MOCK_CATEGORIES);
        setMenuItems(MOCK_MENU_ITEMS);
        
        // Selecionar primeira categoria por padrão
        if (MOCK_CATEGORIES.length > 0) {
          setSelectedCategory(MOCK_CATEGORIES[0].id);
        }
      } catch (error) {
        console.error('Erro ao carregar menu:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadMenu();
  }, []);
  
  // Filtrar itens do menu
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === null || item.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
                         item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });
  
  // Renderizar categoria
  const renderCategory = (category: Category) => {
    const isSelected = selectedCategory === category.id;
    
    return (
      <TouchableOpacity
        key={category.id}
        onPress={() => setSelectedCategory(category.id)}
        style={[styles.categoryItem, isSelected && styles.selectedCategoryItem]}
      >
        <Text style={[styles.categoryText, isSelected && styles.selectedCategoryText]}>
          {category.name}
        </Text>
      </TouchableOpacity>
    );
  };
  
  // Renderizar item do menu
  const renderMenuItem = (item: MenuItem) => {
    return (
      <Card 
        key={item.id} 
        style={styles.menuItemCard}
        onPress={() => setSelectedItem(item)}
      >
        <Card.Content>
          <View style={styles.menuItemHeader}>
            <View>
              <Title style={styles.menuItemTitle}>{item.name}</Title>
              <Paragraph numberOfLines={2} style={styles.menuItemDescription}>
                {item.description}
              </Paragraph>
            </View>
            <Text style={styles.menuItemPrice}>R$ {item.price.toFixed(2)}</Text>
          </View>
          
          <View style={styles.menuItemFooter}>
            {item.popular && (
              <Chip icon="star" style={styles.popularChip}>Popular</Chip>
            )}
            
            {item.allergens && item.allergens.length > 0 && (
              <TouchableOpacity 
                onPress={() => {
                  setSelectedItem(item);
                  setShowNutritionalInfo(true);
                }}
                style={styles.allergenButton}
              >
                <Icon name="food-variant" size={16} color="#F44336" />
                <Text style={styles.allergenText}>Alérgenos</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card.Content>
        
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="outlined" 
            onPress={() => setSelectedItem(item)}
            icon="information-outline"
          >
            Detalhes
          </Button>
          
          <Button 
            mode="contained" 
            onPress={() => console.log('Adicionar ao pedido:', item)}
            icon="plus"
            disabled={!item.available}
          >
            Adicionar
          </Button>
        </Card.Actions>
      </Card>
    );
  };
  
  return (
    <View style={styles.container}>
      {/* Barra de pesquisa */}
      <TextInput
        label="Buscar no cardápio"
        value={searchQuery}
        onChangeText={setSearchQuery}
        mode="outlined"
        style={styles.searchBar}
        left={<TextInput.Icon icon="magnify" />}
        right={searchQuery ? <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} /> : null}
      />
      
      {/* Status de sincronização */}
      {!isOnline && (
        <View style={styles.offlineBar}>
          <Icon name="cloud-off-outline" size={16} color="#fff" />
          <Text style={styles.offlineText}>Offline</Text>
        </View>
      )}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Carregando cardápio...</Text>
        </View>
      ) : (
        <>
          {/* Categorias */}
          <View style={styles.categoriesContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScrollView}
            >
              {categories.map(renderCategory)}
            </ScrollView>
          </View>
          
          {/* Itens do menu */}
          <ScrollView contentContainerStyle={styles.menuItemsContainer}>
            {filteredItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="food-off" size={64} color="#BDBDBD" />
                <Text style={styles.emptyText}>Nenhum item encontrado</Text>
              </View>
            ) : (
              filteredItems.map(renderMenuItem)
            )}
          </ScrollView>
        </>
      )}
      
      {/* Modal de detalhes do item */}
      <Portal>
        <Dialog visible={!!selectedItem} onDismiss={() => setSelectedItem(null)} style={styles.itemDialog}>
          {selectedItem && (
            <>
              <Dialog.Title>{selectedItem.name}</Dialog.Title>
              <Dialog.Content>
                <Paragraph style={styles.itemDialogDescription}>
                  {selectedItem.description}
                </Paragraph>
                
                <Text style={styles.itemDialogPrice}>
                  R$ {selectedItem.price.toFixed(2)}
                </Text>
                
                {selectedItem.nutritionalInfo && (
                  <View style={styles.nutritionalInfoContainer}>
                    <Text style={styles.nutritionalInfoTitle}>Informações Nutricionais</Text>
                    <View style={styles.nutritionalInfoGrid}>
                      <View style={styles.nutritionalInfoItem}>
                        <Text style={styles.nutritionalInfoValue}>{selectedItem.nutritionalInfo.calories}</Text>
                        <Text style={styles.nutritionalInfoLabel}>Calorias</Text>
                      </View>
                      <View style={styles.nutritionalInfoItem}>
                        <Text style={styles.nutritionalInfoValue}>{selectedItem.nutritionalInfo.protein}g</Text>
                        <Text style={styles.nutritionalInfoLabel}>Proteínas</Text>
                      </View>
                      <View style={styles.nutritionalInfoItem}>
                        <Text style={styles.nutritionalInfoValue}>{selectedItem.nutritionalInfo.carbs}g</Text>
                        <Text style={styles.nutritionalInfoLabel}>Carboidratos</Text>
                      </View>
                      <View style={styles.nutritionalInfoItem}>
                        <Text style={styles.nutritionalInfoValue}>{selectedItem.nutritionalInfo.fat}g</Text>
                        <Text style={styles.nutritionalInfoLabel}>Gorduras</Text>
                      </View>
                    </View>
                  </View>
                )}
                
                {selectedItem.allergens && selectedItem.allergens.length > 0 && (
                  <View style={styles.allergensContainer}>
                    <Text style={styles.allergensTitle}>Alérgenos</Text>
                    <View style={styles.allergensChips}>
                      {selectedItem.allergens.map((allergen, index) => (
                        <Chip key={index} style={styles.allergenChip} icon="alert-circle">
                          {allergen}
                        </Chip>
                      ))}
                    </View>
                  </View>
                )}
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setSelectedItem(null)}>Fechar</Button>
                <Button 
                  mode="contained" 
                  onPress={() => {
                    console.log('Adicionar ao pedido:', selectedItem);
                    setSelectedItem(null);
                  }}
                  disabled={!selectedItem.available}
                >
                  Adicionar ao Pedido
                </Button>
              </Dialog.Actions>
            </>
          )}
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    margin: 8,
    elevation: 2,
  },
  offlineBar: {
    backgroundColor: '#F44336',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#757575',
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    elevation: 2,
  },
  categoriesScrollView: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  selectedCategoryItem: {
    backgroundColor: '#2196F3',
  },
  categoryText: {
    color: '#212121',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#fff',
  },
  menuItemsContainer: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    marginTop: 64,
  },
  emptyText: {
    marginTop: 16,
    color: '#757575',
    fontSize: 16,
  },
  menuItemCard: {
    marginBottom: 8,
    elevation: 2,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  menuItemTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#757575',
    flex: 1,
    marginRight: 8,
  },
  menuItemPrice: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  menuItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  popularChip: {
    backgroundColor: '#FFF3E0',
    height: 24,
  },
  allergenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  allergenText: {
    color: '#F44336',
    marginLeft: 4,
    fontSize: 12,
  },
  cardActions: {
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  itemDialog: {
    maxHeight: '80%',
  },
  itemDialogDescription: {
    marginBottom: 16,
  },
  itemDialogPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  nutritionalInfoContainer: {
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  nutritionalInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  nutritionalInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionalInfoItem: {
    alignItems: 'center',
  },
  nutritionalInfoValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  nutritionalInfoLabel: {
    fontSize: 12,
    color: '#757575',
  },
  allergensContainer: {
    marginTop: 16,
  },
  allergensTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  allergensChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  allergenChip: {
    margin: 4,
    backgroundColor: '#FFEBEE',
  },
});

export default MenuScreen;

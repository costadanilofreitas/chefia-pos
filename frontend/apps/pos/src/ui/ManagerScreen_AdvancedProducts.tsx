  // Renderizar Sistema Avançado de Produtos
  const renderAdvancedProducts = () => {
    const [productTab, setProductTab] = useState(0);

    const handleProductTabChange = (event: React.SyntheticEvent, newValue: number) => {
      setProductTab(newValue);
    };

    return (
      <Box>
        <Typography variant="h5" mb={3}>Sistema Avançado de Produtos</Typography>
        
        <Paper sx={{ width: '100%' }}>
          <Tabs 
            value={productTab} 
            onChange={handleProductTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<CategoryIcon />} label="Categorias" />
            <Tab icon={<IngredientIcon />} label="Ingredientes" />
            <Tab icon={<MenuIcon />} label="Produtos" />
            <Tab icon={<ComboIcon />} label="Combos" />
          </Tabs>

          {/* Aba Categorias */}
          <TabPanel value={productTab} index={0}>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Gestão de Categorias</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryDialogOpen(true);
                  }}
                >
                  Nova Categoria
                </Button>
              </Box>

              <Grid container spacing={2}>
                {categories.map((category) => (
                  <Grid item xs={12} sm={6} md={4} key={category.id}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              backgroundColor: category.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mr: 2,
                              fontSize: '1.5rem'
                            }}
                          >
                            {category.icon}
                          </Box>
                          <Box flex={1}>
                            <Typography variant="h6">{category.name}</Typography>
                            <Typography variant="body2" color="textSecondary">
                              {category.description}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Chip 
                            label={category.active ? 'Ativa' : 'Inativa'}
                            color={category.active ? 'success' : 'default'}
                            size="small"
                          />
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setEditingCategory(category);
                              setCategoryDialogOpen(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </TabPanel>

          {/* Aba Ingredientes */}
          <TabPanel value={productTab} index={1}>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Gestão de Ingredientes</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingIngredient(null);
                    setIngredientDialogOpen(true);
                  }}
                >
                  Novo Ingrediente
                </Button>
              </Box>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nome</TableCell>
                      <TableCell>Estoque Atual</TableCell>
                      <TableCell>Estoque Mínimo</TableCell>
                      <TableCell>Custo</TableCell>
                      <TableCell>Fornecedor</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ingredients.map((ingredient) => (
                      <TableRow key={ingredient.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {ingredient.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {ingredient.unit}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Typography variant="body2">
                              {ingredient.currentStock}
                            </Typography>
                            {ingredient.currentStock <= ingredient.minimumStock && (
                              <WarningIcon color="warning" sx={{ ml: 1 }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{ingredient.minimumStock}</TableCell>
                        <TableCell>{formatCurrency(ingredient.cost)}</TableCell>
                        <TableCell>{ingredient.supplier}</TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Chip 
                              label={ingredient.active ? 'Ativo' : 'Inativo'}
                              color={ingredient.active ? 'success' : 'default'}
                              size="small"
                            />
                            {ingredient.outOfStock && (
                              <Chip 
                                label="Em Falta"
                                color="error"
                                size="small"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <IconButton 
                              size="small"
                              onClick={() => {
                                setEditingIngredient(ingredient);
                                setIngredientDialogOpen(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                            <Switch
                              checked={!ingredient.outOfStock}
                              onChange={() => {
                                const updatedIngredient = ProductManagementService.updateIngredient(
                                  ingredient.id, 
                                  { outOfStock: !ingredient.outOfStock }
                                );
                                if (updatedIngredient) {
                                  loadProductData();
                                  showSnackbar(
                                    `Ingrediente ${updatedIngredient.outOfStock ? 'marcado como em falta' : 'reabastecido'}`,
                                    'success'
                                  );
                                }
                              }}
                              size="small"
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>

          {/* Aba Produtos */}
          <TabPanel value={productTab} index={2}>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Gestão de Produtos</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingProduct(null);
                    setProductDialogOpen(true);
                  }}
                >
                  Novo Produto
                </Button>
              </Box>

              <Grid container spacing={2}>
                {products.map((product) => {
                  const category = categories.find(c => c.id === product.categoryId);
                  const hasUnavailableIngredients = product.ingredients.some(ing => {
                    const ingredient = ingredients.find(i => i.id === ing.ingredientId);
                    return ingredient && ingredient.outOfStock && ing.required;
                  });

                  return (
                    <Grid item xs={12} md={6} lg={4} key={product.id}>
                      <Card>
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="h6">{product.name}</Typography>
                            <Switch 
                              checked={product.available && !hasUnavailableIngredients} 
                              disabled={hasUnavailableIngredients}
                              onChange={() => {
                                const updatedProduct = ProductManagementService.updateProduct(
                                  product.id,
                                  { available: !product.available }
                                );
                                if (updatedProduct) {
                                  loadProductData();
                                  showSnackbar(
                                    `Produto ${updatedProduct.available ? 'habilitado' : 'desabilitado'}`,
                                    'success'
                                  );
                                }
                              }}
                              color="primary"
                            />
                          </Box>
                          
                          <Typography variant="body2" color="textSecondary" mb={1}>
                            {category?.name || 'Sem categoria'}
                          </Typography>
                          
                          <Typography variant="body2" mb={2}>
                            {product.description}
                          </Typography>
                          
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">
                              <strong>Preço:</strong> {formatCurrency(product.price)}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Custo:</strong> {formatCurrency(product.cost)}
                            </Typography>
                          </Box>
                          
                          <Box display="flex" justifyContent="space-between" mb={2}>
                            <Typography variant="body2">
                              <strong>Preparo:</strong> {product.preparationTime}min
                            </Typography>
                            <Typography variant="body2">
                              <strong>Calorias:</strong> {product.calories}
                            </Typography>
                          </Box>

                          {hasUnavailableIngredients && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                              Ingredientes em falta
                            </Alert>
                          )}
                          
                          <Box display="flex" gap={1} mb={2}>
                            {product.allergens.map((allergen) => (
                              <Chip key={allergen} label={allergen} size="small" color="warning" />
                            ))}
                          </Box>
                          
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Button
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => {
                                setEditingProduct(product);
                                setProductDialogOpen(true);
                              }}
                            >
                              Editar
                            </Button>
                            <Typography variant="body2" color="success.main" fontWeight="bold">
                              Margem: {(((product.price - product.cost) / product.price) * 100).toFixed(1)}%
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </TabPanel>

          {/* Aba Combos */}
          <TabPanel value={productTab} index={3}>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Gestão de Combos</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingCombo(null);
                    setComboDialogOpen(true);
                  }}
                >
                  Novo Combo
                </Button>
              </Box>

              <Grid container spacing={2}>
                {combos.map((combo) => (
                  <Grid item xs={12} md={6} lg={4} key={combo.id}>
                    <Card>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="h6">{combo.name}</Typography>
                          <Switch 
                            checked={combo.active} 
                            onChange={() => {
                              // Implementar toggle de combo
                              showSnackbar('Funcionalidade em desenvolvimento', 'info');
                            }}
                            color="primary"
                          />
                        </Box>
                        
                        <Typography variant="body2" mb={2}>
                          {combo.description}
                        </Typography>
                        
                        <Box mb={2}>
                          <Typography variant="body2" fontWeight="bold" mb={1}>
                            Itens do Combo:
                          </Typography>
                          {combo.items.map((item, index) => {
                            const product = products.find(p => p.id === item.productId);
                            return (
                              <Typography key={index} variant="body2" color="textSecondary">
                                • {item.quantity}x {product?.name || 'Produto não encontrado'}
                                {item.optional && ' (Opcional)'}
                              </Typography>
                            );
                          })}
                        </Box>
                        
                        <Box display="flex" justifyContent="space-between" mb={2}>
                          <Typography variant="body2">
                            <strong>Preço Base:</strong> {formatCurrency(combo.basePrice)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Desconto:</strong> {combo.discountPercentage}%
                          </Typography>
                        </Box>
                        
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => {
                              setEditingCombo(combo);
                              setComboDialogOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Typography variant="h6" color="success.main" fontWeight="bold">
                            {formatCurrency(combo.finalPrice)}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </TabPanel>
        </Paper>
      </Box>
    );
  };


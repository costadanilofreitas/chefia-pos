from fastapi import FastAPI
import uvicorn
from src.product.router.product_router_simple import router as product_router

app = FastAPI(
    title='Product Service',
    version='1.0.0',
    description='Microserviço de Produtos para POS System'
)

# Include product router
app.include_router(product_router)

@app.get('/health')
async def health():
    return {'status': 'healthy', 'service': 'product'}

@app.get('/')
async def root():
    return {
        'message': 'Product Service Running',
        'docs': '/docs',
        'health': '/health'
    }

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8002)


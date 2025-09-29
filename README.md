# 📦 Drone Delivery Simulator  

## 📖 Sobre o Projeto  
O **Drone Delivery Simulator** é um sistema fictício criado como parte de um **case técnico de estágio**.  
Ele simula **entregas urbanas realizadas por drones**, organizando pedidos, priorizando entregas e gerenciando o consumo de bateria de forma dinâmica.  

---

## 🚀 Como Instalar e Rodar  
Siga os passos abaixo para rodar o projeto localmente:

```bash
# Clone o repositório
git clone https://github.com/sofiaparreira/api-encomendas-drone.git

# Entre na pasta do projeto
cd api-encomendas-drone

# Instale as dependências
npm install

# Inicie a aplicação
npm start


Logo após, entre no repositório do front-end: https://github.com/sofiaparreira/frontend-encomendas-drone.git

````

---

## 🛠 Tecnologias Utilizadas  
- **JavaScript** – linguagem principal do projeto  
- **Node.JS e Express*

---

## ⚙️ Funcionalidades  

### ✈️ Gerenciamento de Drones  
1. **CRUD de Drones**  
   - Cadastro de drones com capacidade, autonomia e status.  
   - Visualização da lista de drones disponíveis.  
   - Exclusão de drones inativos.  

### 📦 Gestão de Pedidos  
2. **CRUD de Pedidos**  
   - Criação de novos pedidos com localização, peso e prioridade.  
   - Cancelamento de pedidos pendentes.  
   - Atribuição automática do melhor drone disponível para cada pedido.  

3. **Organização de Entregas**  
   - Pedidos são agrupados em **Entregas** (viagens individuais) e distribuídos em **Filas** (cada drone possui sua fila com entregas sequenciais).  
   - A ordem de execução é definida por:  
     1. **Prioridade** (alta → média → baixa).  
     2. **Ordem de chegada** dentro da mesma prioridade.  

### 🚁 Simulação de Operações  
4. **Simulação de Voo**  
   - O drone sai da base, percorre os destinos da entrega e retorna à base.  
   - A quantidade de pedidos por voo depende da capacidade máxima de carga do drone.  

5. **Simulação de Bateria**  
   - A bateria é reduzida proporcionalmente à distância percorrida.  
   - Caso a carga seja insuficiente, o drone executa um **retorno de emergência** à base.  

6. **Recarregamento de Drones**  
   - O sistema permite recarregar a bateria gradualmente até o carregamento completo.  


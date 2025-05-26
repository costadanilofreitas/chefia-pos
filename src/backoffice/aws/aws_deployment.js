// AWS Deployment Configuration for Backoffice
// This file contains the AWS infrastructure setup for the backoffice module

const AWS_REGION = 'us-east-1'; // Default region, can be changed based on requirements

// CloudFormation template for backoffice infrastructure
const cloudformationTemplate = {
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "POS Modern Backoffice Infrastructure",
  "Resources": {
    "BackofficeVPC": {
      "Type": "AWS::EC2::VPC",
      "Properties": {
        "CidrBlock": "10.0.0.0/16",
        "EnableDnsSupport": true,
        "EnableDnsHostnames": true,
        "Tags": [{ "Key": "Name", "Value": "BackofficeVPC" }]
      }
    },
    "PublicSubnet1": {
      "Type": "AWS::EC2::Subnet",
      "Properties": {
        "VpcId": { "Ref": "BackofficeVPC" },
        "AvailabilityZone": { "Fn::Select": [0, { "Fn::GetAZs": "" }] },
        "CidrBlock": "10.0.1.0/24",
        "MapPublicIpOnLaunch": true,
        "Tags": [{ "Key": "Name", "Value": "BackofficePublicSubnet1" }]
      }
    },
    "PublicSubnet2": {
      "Type": "AWS::EC2::Subnet",
      "Properties": {
        "VpcId": { "Ref": "BackofficeVPC" },
        "AvailabilityZone": { "Fn::Select": [1, { "Fn::GetAZs": "" }] },
        "CidrBlock": "10.0.2.0/24",
        "MapPublicIpOnLaunch": true,
        "Tags": [{ "Key": "Name", "Value": "BackofficePublicSubnet2" }]
      }
    },
    "InternetGateway": {
      "Type": "AWS::EC2::InternetGateway",
      "Properties": {
        "Tags": [{ "Key": "Name", "Value": "BackofficeIGW" }]
      }
    },
    "GatewayAttachment": {
      "Type": "AWS::EC2::VPCGatewayAttachment",
      "Properties": {
        "VpcId": { "Ref": "BackofficeVPC" },
        "InternetGatewayId": { "Ref": "InternetGateway" }
      }
    },
    "PublicRouteTable": {
      "Type": "AWS::EC2::RouteTable",
      "Properties": {
        "VpcId": { "Ref": "BackofficeVPC" },
        "Tags": [{ "Key": "Name", "Value": "BackofficePublicRT" }]
      }
    },
    "PublicRoute": {
      "Type": "AWS::EC2::Route",
      "DependsOn": "GatewayAttachment",
      "Properties": {
        "RouteTableId": { "Ref": "PublicRouteTable" },
        "DestinationCidrBlock": "0.0.0.0/0",
        "GatewayId": { "Ref": "InternetGateway" }
      }
    },
    "Subnet1RouteTableAssociation": {
      "Type": "AWS::EC2::SubnetRouteTableAssociation",
      "Properties": {
        "SubnetId": { "Ref": "PublicSubnet1" },
        "RouteTableId": { "Ref": "PublicRouteTable" }
      }
    },
    "Subnet2RouteTableAssociation": {
      "Type": "AWS::EC2::SubnetRouteTableAssociation",
      "Properties": {
        "SubnetId": { "Ref": "PublicSubnet2" },
        "RouteTableId": { "Ref": "PublicRouteTable" }
      }
    },
    "BackofficeSecurityGroup": {
      "Type": "AWS::EC2::SecurityGroup",
      "Properties": {
        "GroupDescription": "Security group for Backoffice",
        "VpcId": { "Ref": "BackofficeVPC" },
        "SecurityGroupIngress": [
          {
            "IpProtocol": "tcp",
            "FromPort": 80,
            "ToPort": 80,
            "CidrIp": "0.0.0.0/0"
          },
          {
            "IpProtocol": "tcp",
            "FromPort": 443,
            "ToPort": 443,
            "CidrIp": "0.0.0.0/0"
          }
        ]
      }
    },
    "BackofficeECR": {
      "Type": "AWS::ECR::Repository",
      "Properties": {
        "RepositoryName": "pos-modern-backoffice"
      }
    },
    "BackofficeECS": {
      "Type": "AWS::ECS::Cluster",
      "Properties": {
        "ClusterName": "BackofficeCluster"
      }
    },
    "BackofficeTaskDefinition": {
      "Type": "AWS::ECS::TaskDefinition",
      "Properties": {
        "Family": "backoffice",
        "Cpu": "256",
        "Memory": "512",
        "NetworkMode": "awsvpc",
        "RequiresCompatibilities": ["FARGATE"],
        "ExecutionRoleArn": { "Ref": "BackofficeExecutionRole" },
        "TaskRoleArn": { "Ref": "BackofficeTaskRole" },
        "ContainerDefinitions": [
          {
            "Name": "backoffice",
            "Image": { "Fn::Join": ["", [{ "Ref": "AWS::AccountId" }, ".dkr.ecr.", { "Ref": "AWS::Region" }, ".amazonaws.com/pos-modern-backoffice:latest"]] },
            "Essential": true,
            "PortMappings": [
              {
                "ContainerPort": 80,
                "HostPort": 80,
                "Protocol": "tcp"
              }
            ],
            "LogConfiguration": {
              "LogDriver": "awslogs",
              "Options": {
                "awslogs-group": { "Ref": "BackofficeLogGroup" },
                "awslogs-region": { "Ref": "AWS::Region" },
                "awslogs-stream-prefix": "backoffice"
              }
            }
          }
        ]
      }
    },
    "BackofficeService": {
      "Type": "AWS::ECS::Service",
      "DependsOn": ["BackofficeALBListener"],
      "Properties": {
        "ServiceName": "BackofficeService",
        "Cluster": { "Ref": "BackofficeECS" },
        "TaskDefinition": { "Ref": "BackofficeTaskDefinition" },
        "LaunchType": "FARGATE",
        "DesiredCount": 2,
        "DeploymentConfiguration": {
          "MaximumPercent": 200,
          "MinimumHealthyPercent": 50
        },
        "NetworkConfiguration": {
          "AwsvpcConfiguration": {
            "AssignPublicIp": "ENABLED",
            "SecurityGroups": [{ "Ref": "BackofficeSecurityGroup" }],
            "Subnets": [{ "Ref": "PublicSubnet1" }, { "Ref": "PublicSubnet2" }]
          }
        },
        "LoadBalancers": [
          {
            "ContainerName": "backoffice",
            "ContainerPort": 80,
            "TargetGroupArn": { "Ref": "BackofficeTargetGroup" }
          }
        ]
      }
    },
    "BackofficeALB": {
      "Type": "AWS::ElasticLoadBalancingV2::LoadBalancer",
      "Properties": {
        "Name": "BackofficeALB",
        "Scheme": "internet-facing",
        "LoadBalancerAttributes": [
          {
            "Key": "idle_timeout.timeout_seconds",
            "Value": "60"
          }
        ],
        "Subnets": [{ "Ref": "PublicSubnet1" }, { "Ref": "PublicSubnet2" }],
        "SecurityGroups": [{ "Ref": "BackofficeSecurityGroup" }]
      }
    },
    "BackofficeTargetGroup": {
      "Type": "AWS::ElasticLoadBalancingV2::TargetGroup",
      "Properties": {
        "Name": "BackofficeTargetGroup",
        "Port": 80,
        "Protocol": "HTTP",
        "TargetType": "ip",
        "VpcId": { "Ref": "BackofficeVPC" },
        "HealthCheckPath": "/api/backoffice/health",
        "HealthCheckIntervalSeconds": 30,
        "HealthCheckTimeoutSeconds": 5,
        "HealthyThresholdCount": 3,
        "UnhealthyThresholdCount": 3
      }
    },
    "BackofficeALBListener": {
      "Type": "AWS::ElasticLoadBalancingV2::Listener",
      "Properties": {
        "DefaultActions": [
          {
            "Type": "forward",
            "TargetGroupArn": { "Ref": "BackofficeTargetGroup" }
          }
        ],
        "LoadBalancerArn": { "Ref": "BackofficeALB" },
        "Port": 80,
        "Protocol": "HTTP"
      }
    },
    "BackofficeExecutionRole": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Principal": {
                "Service": "ecs-tasks.amazonaws.com"
              },
              "Action": "sts:AssumeRole"
            }
          ]
        },
        "ManagedPolicyArns": [
          "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
        ]
      }
    },
    "BackofficeTaskRole": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Principal": {
                "Service": "ecs-tasks.amazonaws.com"
              },
              "Action": "sts:AssumeRole"
            }
          ]
        }
      }
    },
    "BackofficeLogGroup": {
      "Type": "AWS::Logs::LogGroup",
      "Properties": {
        "LogGroupName": "/ecs/backoffice",
        "RetentionInDays": 30
      }
    },
    "BackofficeDynamoDB": {
      "Type": "AWS::DynamoDB::Table",
      "Properties": {
        "TableName": "BackofficeUsers",
        "BillingMode": "PAY_PER_REQUEST",
        "AttributeDefinitions": [
          {
            "AttributeName": "id",
            "AttributeType": "S"
          },
          {
            "AttributeName": "username",
            "AttributeType": "S"
          }
        ],
        "KeySchema": [
          {
            "AttributeName": "id",
            "KeyType": "HASH"
          }
        ],
        "GlobalSecondaryIndexes": [
          {
            "IndexName": "UsernameIndex",
            "KeySchema": [
              {
                "AttributeName": "username",
                "KeyType": "HASH"
              }
            ],
            "Projection": {
              "ProjectionType": "ALL"
            }
          }
        ]
      }
    },
    "BackofficeS3Bucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": { "Fn::Join": ["-", ["pos-modern-backoffice", { "Ref": "AWS::AccountId" }]] },
        "AccessControl": "Private",
        "PublicAccessBlockConfiguration": {
          "BlockPublicAcls": true,
          "BlockPublicPolicy": true,
          "IgnorePublicAcls": true,
          "RestrictPublicBuckets": true
        },
        "VersioningConfiguration": {
          "Status": "Enabled"
        },
        "BucketEncryption": {
          "ServerSideEncryptionConfiguration": [
            {
              "ServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
              }
            }
          ]
        }
      }
    },
    "BackofficeCloudfrontDistribution": {
      "Type": "AWS::CloudFront::Distribution",
      "Properties": {
        "DistributionConfig": {
          "Origins": [
            {
              "DomainName": { "Fn::GetAtt": ["BackofficeALB", "DNSName"] },
              "Id": "BackofficeALBOrigin",
              "CustomOriginConfig": {
                "HTTPPort": 80,
                "HTTPSPort": 443,
                "OriginProtocolPolicy": "http-only"
              }
            }
          ],
          "Enabled": true,
          "DefaultCacheBehavior": {
            "TargetOriginId": "BackofficeALBOrigin",
            "ViewerProtocolPolicy": "redirect-to-https",
            "AllowedMethods": ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"],
            "CachedMethods": ["GET", "HEAD"],
            "ForwardedValues": {
              "QueryString": true,
              "Cookies": {
                "Forward": "all"
              },
              "Headers": ["*"]
            },
            "MinTTL": 0,
            "DefaultTTL": 3600,
            "MaxTTL": 86400
          },
          "PriceClass": "PriceClass_100",
          "ViewerCertificate": {
            "CloudFrontDefaultCertificate": true
          }
        }
      }
    }
  },
  "Outputs": {
    "BackofficeURL": {
      "Description": "URL of the Backoffice application",
      "Value": { "Fn::Join": ["", ["http://", { "Fn::GetAtt": ["BackofficeALB", "DNSName"] }]] }
    },
    "CloudfrontURL": {
      "Description": "CloudFront URL for the Backoffice application",
      "Value": { "Fn::Join": ["", ["https://", { "Fn::GetAtt": ["BackofficeCloudfrontDistribution", "DomainName"] }]] }
    }
  }
};

// CI/CD Pipeline configuration
const cicdPipeline = {
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "CI/CD Pipeline for POS Modern Backoffice",
  "Resources": {
    "BackofficeCodeBuildServiceRole": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Principal": {
                "Service": "codebuild.amazonaws.com"
              },
              "Action": "sts:AssumeRole"
            }
          ]
        },
        "ManagedPolicyArns": [
          "arn:aws:iam::aws:policy/AmazonECR-FullAccess",
          "arn:aws:iam::aws:policy/AmazonS3FullAccess"
        ]
      }
    },
    "BackofficeCodePipelineServiceRole": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Principal": {
                "Service": "codepipeline.amazonaws.com"
              },
              "Action": "sts:AssumeRole"
            }
          ]
        },
        "ManagedPolicyArns": [
          "arn:aws:iam::aws:policy/AWSCodeBuildAdminAccess",
          "arn:aws:iam::aws:policy/AmazonS3FullAccess",
          "arn:aws:iam::aws:policy/AmazonECR-FullAccess"
        ]
      }
    },
    "BackofficeArtifactBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "VersioningConfiguration": {
          "Status": "Enabled"
        }
      }
    },
    "BackofficeBuildProject": {
      "Type": "AWS::CodeBuild::Project",
      "Properties": {
        "Name": "BackofficeBuild",
        "ServiceRole": { "Fn::GetAtt": ["BackofficeCodeBuildServiceRole", "Arn"] },
        "Artifacts": {
          "Type": "CODEPIPELINE"
        },
        "Environment": {
          "Type": "LINUX_CONTAINER",
          "ComputeType": "BUILD_GENERAL1_SMALL",
          "Image": "aws/codebuild/amazonlinux2-x86_64-standard:3.0",
          "PrivilegedMode": true
        },
        "Source": {
          "Type": "CODEPIPELINE",
          "BuildSpec": "buildspec.yml"
        }
      }
    },
    "BackofficePipeline": {
      "Type": "AWS::CodePipeline::Pipeline",
      "Properties": {
        "RoleArn": { "Fn::GetAtt": ["BackofficeCodePipelineServiceRole", "Arn"] },
        "ArtifactStore": {
          "Type": "S3",
          "Location": { "Ref": "BackofficeArtifactBucket" }
        },
        "Stages": [
          {
            "Name": "Source",
            "Actions": [
              {
                "Name": "Source",
                "ActionTypeId": {
                  "Category": "Source",
                  "Owner": "AWS",
                  "Provider": "CodeStarSourceConnection",
                  "Version": "1"
                },
                "Configuration": {
                  "ConnectionArn": "arn:aws:codestar-connections:us-east-1:123456789012:connection/example-connection",
                  "FullRepositoryId": "costadanilofreitas/chefia-pos",
                  "BranchName": "main"
                },
                "OutputArtifacts": [
                  {
                    "Name": "SourceCode"
                  }
                ]
              }
            ]
          },
          {
            "Name": "Build",
            "Actions": [
              {
                "Name": "BuildAndPush",
                "ActionTypeId": {
                  "Category": "Build",
                  "Owner": "AWS",
                  "Provider": "CodeBuild",
                  "Version": "1"
                },
                "Configuration": {
                  "ProjectName": { "Ref": "BackofficeBuildProject" }
                },
                "InputArtifacts": [
                  {
                    "Name": "SourceCode"
                  }
                ],
                "OutputArtifacts": [
                  {
                    "Name": "BuildOutput"
                  }
                ]
              }
            ]
          },
          {
            "Name": "Deploy",
            "Actions": [
              {
                "Name": "DeployToECS",
                "ActionTypeId": {
                  "Category": "Deploy",
                  "Owner": "AWS",
                  "Provider": "ECS",
                  "Version": "1"
                },
                "Configuration": {
                  "ClusterName": "BackofficeCluster",
                  "ServiceName": "BackofficeService",
                  "FileName": "imagedefinitions.json"
                },
                "InputArtifacts": [
                  {
                    "Name": "BuildOutput"
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  },
  "Outputs": {
    "PipelineURL": {
      "Description": "URL to the CodePipeline console",
      "Value": { "Fn::Join": ["", ["https://console.aws.amazon.com/codepipeline/home?region=", { "Ref": "AWS::Region" }, "#/view/", { "Ref": "BackofficePipeline" }]] }
    }
  }
};

// Dockerfile for the backoffice application
const dockerfile = `
FROM node:16-alpine AS frontend-builder
WORKDIR /app
COPY src/backoffice/frontend ./frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/backoffice ./backoffice
COPY --from=frontend-builder /app/frontend/build ./backoffice/static

EXPOSE 80
CMD ["uvicorn", "backoffice.main:app", "--host", "0.0.0.0", "--port", "80"]
`;

// buildspec.yml for AWS CodeBuild
const buildspec = `
version: 0.2

phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
      - REPOSITORY_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/pos-modern-backoffice
      - COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)
      - IMAGE_TAG=${COMMIT_HASH:=latest}
  build:
    commands:
      - echo Build started on `date`
      - echo Building the Docker image...
      - docker build -t $REPOSITORY_URI:latest .
      - docker tag $REPOSITORY_URI:latest $REPOSITORY_URI:$IMAGE_TAG
  post_build:
    commands:
      - echo Build completed on `date`
      - echo Pushing the Docker images...
      - docker push $REPOSITORY_URI:latest
      - docker push $REPOSITORY_URI:$IMAGE_TAG
      - echo Writing image definitions file...
      - echo '[{"name":"backoffice","imageUri":"'$REPOSITORY_URI:$IMAGE_TAG'"}]' > imagedefinitions.json

artifacts:
  files:
    - imagedefinitions.json
    - appspec.yml
    - taskdef.json
`;

// Export the configuration
module.exports = {
  AWS_REGION,
  cloudformationTemplate,
  cicdPipeline,
  dockerfile,
  buildspec
};

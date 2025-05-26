// AWS CloudFormation template for Backoffice deployment
// This file contains the AWS CloudFormation template for deploying the backoffice to AWS

const cloudformation = {
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "POS Modern Backoffice Deployment",
  
  "Parameters": {
    "Environment": {
      "Type": "String",
      "Default": "Production",
      "AllowedValues": ["Development", "Staging", "Production"],
      "Description": "Environment type for the backoffice deployment"
    },
    "DomainName": {
      "Type": "String",
      "Default": "",
      "Description": "Optional domain name for the backoffice (leave empty to use CloudFront domain)"
    }
  },
  
  "Conditions": {
    "HasCustomDomain": {"Fn::Not": [{"Fn::Equals": ["", {"Ref": "DomainName"}]}]}
  },
  
  "Resources": {
    // VPC and Network Configuration
    "BackofficeVPC": {
      "Type": "AWS::EC2::VPC",
      "Properties": {
        "CidrBlock": "10.0.0.0/16",
        "EnableDnsSupport": true,
        "EnableDnsHostnames": true,
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-VPC"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    },
    
    "PublicSubnet1": {
      "Type": "AWS::EC2::Subnet",
      "Properties": {
        "VpcId": {"Ref": "BackofficeVPC"},
        "AvailabilityZone": {"Fn::Select": [0, {"Fn::GetAZs": ""}]},
        "CidrBlock": "10.0.1.0/24",
        "MapPublicIpOnLaunch": true,
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-PublicSubnet1"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    },
    
    "PublicSubnet2": {
      "Type": "AWS::EC2::Subnet",
      "Properties": {
        "VpcId": {"Ref": "BackofficeVPC"},
        "AvailabilityZone": {"Fn::Select": [1, {"Fn::GetAZs": ""}]},
        "CidrBlock": "10.0.2.0/24",
        "MapPublicIpOnLaunch": true,
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-PublicSubnet2"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    },
    
    "InternetGateway": {
      "Type": "AWS::EC2::InternetGateway",
      "Properties": {
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-IGW"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    },
    
    "VPCGatewayAttachment": {
      "Type": "AWS::EC2::VPCGatewayAttachment",
      "Properties": {
        "VpcId": {"Ref": "BackofficeVPC"},
        "InternetGatewayId": {"Ref": "InternetGateway"}
      }
    },
    
    "PublicRouteTable": {
      "Type": "AWS::EC2::RouteTable",
      "Properties": {
        "VpcId": {"Ref": "BackofficeVPC"},
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-PublicRT"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    },
    
    "PublicRoute": {
      "Type": "AWS::EC2::Route",
      "DependsOn": "VPCGatewayAttachment",
      "Properties": {
        "RouteTableId": {"Ref": "PublicRouteTable"},
        "DestinationCidrBlock": "0.0.0.0/0",
        "GatewayId": {"Ref": "InternetGateway"}
      }
    },
    
    "PublicSubnet1RouteTableAssociation": {
      "Type": "AWS::EC2::SubnetRouteTableAssociation",
      "Properties": {
        "SubnetId": {"Ref": "PublicSubnet1"},
        "RouteTableId": {"Ref": "PublicRouteTable"}
      }
    },
    
    "PublicSubnet2RouteTableAssociation": {
      "Type": "AWS::EC2::SubnetRouteTableAssociation",
      "Properties": {
        "SubnetId": {"Ref": "PublicSubnet2"},
        "RouteTableId": {"Ref": "PublicRouteTable"}
      }
    },
    
    // Security Groups
    "BackofficeSecurityGroup": {
      "Type": "AWS::EC2::SecurityGroup",
      "Properties": {
        "GroupDescription": "Security group for Backoffice application",
        "VpcId": {"Ref": "BackofficeVPC"},
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
        ],
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-SG"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    },
    
    // Database
    "BackofficeDatabase": {
      "Type": "AWS::RDS::DBInstance",
      "Properties": {
        "AllocatedStorage": "20",
        "DBInstanceClass": "db.t3.micro",
        "Engine": "postgres",
        "EngineVersion": "13.7",
        "MasterUsername": "posmodern",
        "MasterUserPassword": {"Fn::Join": ["", ["{{resolve:secretsmanager:", {"Ref": "BackofficeDBSecret"}, ":SecretString:password}}"]]},
        "DBName": "backoffice",
        "VPCSecurityGroups": [{"Ref": "BackofficeDBSecurityGroup"}],
        "DBSubnetGroupName": {"Ref": "BackofficeDBSubnetGroup"},
        "MultiAZ": {"Fn::If": ["IsProduction", true, false]},
        "StorageType": "gp2",
        "BackupRetentionPeriod": {"Fn::If": ["IsProduction", 7, 1]},
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-DB"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      },
      "DeletionPolicy": "Snapshot"
    },
    
    "BackofficeDBSecurityGroup": {
      "Type": "AWS::EC2::SecurityGroup",
      "Properties": {
        "GroupDescription": "Security group for Backoffice RDS instance",
        "VpcId": {"Ref": "BackofficeVPC"},
        "SecurityGroupIngress": [
          {
            "IpProtocol": "tcp",
            "FromPort": 5432,
            "ToPort": 5432,
            "SourceSecurityGroupId": {"Ref": "BackofficeSecurityGroup"}
          }
        ],
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-DB-SG"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    },
    
    "BackofficeDBSubnetGroup": {
      "Type": "AWS::RDS::DBSubnetGroup",
      "Properties": {
        "DBSubnetGroupDescription": "Subnet group for Backoffice RDS instance",
        "SubnetIds": [{"Ref": "PublicSubnet1"}, {"Ref": "PublicSubnet2"}],
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-DB-SubnetGroup"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    },
    
    "BackofficeDBSecret": {
      "Type": "AWS::SecretsManager::Secret",
      "Properties": {
        "Description": "Secret for Backoffice RDS instance",
        "GenerateSecretString": {
          "SecretStringTemplate": "{\"username\":\"posmodern\"}",
          "GenerateStringKey": "password",
          "PasswordLength": 16,
          "ExcludeCharacters": "\"@/\\"
        },
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-DB-Secret"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    },
    
    // ECS Cluster and Service
    "BackofficeCluster": {
      "Type": "AWS::ECS::Cluster",
      "Properties": {
        "ClusterName": {"Fn::Sub": "${AWS::StackName}-Cluster"},
        "CapacityProviders": ["FARGATE", "FARGATE_SPOT"],
        "DefaultCapacityProviderStrategy": [
          {
            "CapacityProvider": "FARGATE",
            "Weight": 1
          }
        ],
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-Cluster"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    },
    
    "BackofficeTaskDefinition": {
      "Type": "AWS::ECS::TaskDefinition",
      "Properties": {
        "Family": {"Fn::Sub": "${AWS::StackName}-Task"},
        "Cpu": "512",
        "Memory": "1024",
        "NetworkMode": "awsvpc",
        "RequiresCompatibilities": ["FARGATE"],
        "ExecutionRoleArn": {"Ref": "BackofficeExecutionRole"},
        "TaskRoleArn": {"Ref": "BackofficeTaskRole"},
        "ContainerDefinitions": [
          {
            "Name": "backoffice",
            "Image": {"Fn::Sub": "${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/pos-modern-backoffice:latest"},
            "Essential": true,
            "PortMappings": [
              {
                "ContainerPort": 80,
                "HostPort": 80,
                "Protocol": "tcp"
              }
            ],
            "Environment": [
              {
                "Name": "ENVIRONMENT",
                "Value": {"Ref": "Environment"}
              },
              {
                "Name": "DB_HOST",
                "Value": {"Fn::GetAtt": ["BackofficeDatabase", "Endpoint.Address"]}
              },
              {
                "Name": "DB_PORT",
                "Value": {"Fn::GetAtt": ["BackofficeDatabase", "Endpoint.Port"]}
              },
              {
                "Name": "DB_NAME",
                "Value": "backoffice"
              },
              {
                "Name": "DB_USER",
                "Value": "posmodern"
              }
            ],
            "Secrets": [
              {
                "Name": "DB_PASSWORD",
                "ValueFrom": {"Fn::Join": ["", ["arn:aws:secretsmanager:", {"Ref": "AWS::Region"}, ":", {"Ref": "AWS::AccountId"}, ":secret:", {"Ref": "BackofficeDBSecret"}, ":password::"]]}
              }
            ],
            "LogConfiguration": {
              "LogDriver": "awslogs",
              "Options": {
                "awslogs-group": {"Ref": "BackofficeLogGroup"},
                "awslogs-region": {"Ref": "AWS::Region"},
                "awslogs-stream-prefix": "backoffice"
              }
            },
            "HealthCheck": {
              "Command": ["CMD-SHELL", "curl -f http://localhost/api/backoffice/health || exit 1"],
              "Interval": 30,
              "Timeout": 5,
              "Retries": 3,
              "StartPeriod": 60
            }
          }
        ],
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-TaskDef"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    },
    
    "BackofficeService": {
      "Type": "AWS::ECS::Service",
      "DependsOn": ["BackofficeALBListener"],
      "Properties": {
        "ServiceName": {"Fn::Sub": "${AWS::StackName}-Service"},
        "Cluster": {"Ref": "BackofficeCluster"},
        "TaskDefinition": {"Ref": "BackofficeTaskDefinition"},
        "LaunchType": "FARGATE",
        "DesiredCount": {"Fn::If": ["IsProduction", 2, 1]},
        "DeploymentConfiguration": {
          "MaximumPercent": 200,
          "MinimumHealthyPercent": 50,
          "DeploymentCircuitBreaker": {
            "Enable": true,
            "Rollback": true
          }
        },
        "NetworkConfiguration": {
          "AwsvpcConfiguration": {
            "AssignPublicIp": "ENABLED",
            "SecurityGroups": [{"Ref": "BackofficeSecurityGroup"}],
            "Subnets": [{"Ref": "PublicSubnet1"}, {"Ref": "PublicSubnet2"}]
          }
        },
        "LoadBalancers": [
          {
            "ContainerName": "backoffice",
            "ContainerPort": 80,
            "TargetGroupArn": {"Ref": "BackofficeTargetGroup"}
          }
        ],
        "HealthCheckGracePeriodSeconds": 60,
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-Service"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    },
    
    // Load Balancer
    "BackofficeALB": {
      "Type": "AWS::ElasticLoadBalancingV2::LoadBalancer",
      "Properties": {
        "Name": {"Fn::Sub": "${AWS::StackName}-ALB"},
        "Scheme": "internet-facing",
        "LoadBalancerAttributes": [
          {
            "Key": "idle_timeout.timeout_seconds",
            "Value": "60"
          }
        ],
        "Subnets": [{"Ref": "PublicSubnet1"}, {"Ref": "PublicSubnet2"}],
        "SecurityGroups": [{"Ref": "BackofficeSecurityGroup"}],
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-ALB"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    },
    
    "BackofficeTargetGroup": {
      "Type": "AWS::ElasticLoadBalancingV2::TargetGroup",
      "Properties": {
        "Name": {"Fn::Sub": "${AWS::StackName}-TG"},
        "Port": 80,
        "Protocol": "HTTP",
        "TargetType": "ip",
        "VpcId": {"Ref": "BackofficeVPC"},
        "HealthCheckPath": "/api/backoffice/health",
        "HealthCheckIntervalSeconds": 30,
        "HealthCheckTimeoutSeconds": 5,
        "HealthyThresholdCount": 3,
        "UnhealthyThresholdCount": 3,
        "TargetGroupAttributes": [
          {
            "Key": "deregistration_delay.timeout_seconds",
            "Value": "30"
          }
        ],
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-TG"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    },
    
    "BackofficeALBListener": {
      "Type": "AWS::ElasticLoadBalancingV2::Listener",
      "Properties": {
        "DefaultActions": [
          {
            "Type": "forward",
            "TargetGroupArn": {"Ref": "BackofficeTargetGroup"}
          }
        ],
        "LoadBalancerArn": {"Ref": "BackofficeALB"},
        "Port": 80,
        "Protocol": "HTTP"
      }
    },
    
    // IAM Roles
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
          "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
          "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"
        ],
        "Policies": [
          {
            "PolicyName": "SecretsManagerAccess",
            "PolicyDocument": {
              "Version": "2012-10-17",
              "Statement": [
                {
                  "Effect": "Allow",
                  "Action": [
                    "secretsmanager:GetSecretValue"
                  ],
                  "Resource": {"Ref": "BackofficeDBSecret"}
                }
              ]
            }
          }
        ],
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-ExecutionRole"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
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
        },
        "Policies": [
          {
            "PolicyName": "BackofficeTaskPolicy",
            "PolicyDocument": {
              "Version": "2012-10-17",
              "Statement": [
                {
                  "Effect": "Allow",
                  "Action": [
                    "s3:GetObject",
                    "s3:PutObject",
                    "s3:ListBucket"
                  ],
                  "Resource": [
                    {"Fn::Sub": "arn:aws:s3:::${BackofficeS3Bucket}"},
                    {"Fn::Sub": "arn:aws:s3:::${BackofficeS3Bucket}/*"}
                  ]
                }
              ]
            }
          }
        ],
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-TaskRole"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    },
    
    // CloudWatch Logs
    "BackofficeLogGroup": {
      "Type": "AWS::Logs::LogGroup",
      "Properties": {
        "LogGroupName": {"Fn::Sub": "/ecs/${AWS::StackName}"},
        "RetentionInDays": {"Fn::If": ["IsProduction", 30, 7]},
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-LogGroup"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    },
    
    // S3 Bucket for Assets
    "BackofficeS3Bucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": {"Fn::Sub": "pos-modern-backoffice-${AWS::AccountId}-${AWS::Region}"},
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
        },
        "LifecycleConfiguration": {
          "Rules": [
            {
              "Id": "DeleteOldVersions",
              "Status": "Enabled",
              "NoncurrentVersionExpiration": {
                "NoncurrentDays": 30
              }
            }
          ]
        },
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-S3Bucket"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    },
    
    // CloudFront Distribution
    "BackofficeCloudfrontDistribution": {
      "Type": "AWS::CloudFront::Distribution",
      "Properties": {
        "DistributionConfig": {
          "Origins": [
            {
              "DomainName": {"Fn::GetAtt": ["BackofficeALB", "DNSName"]},
              "Id": "BackofficeALBOrigin",
              "CustomOriginConfig": {
                "HTTPPort": 80,
                "HTTPSPort": 443,
                "OriginProtocolPolicy": "http-only",
                "OriginReadTimeout": 60,
                "OriginKeepaliveTimeout": 5
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
            "MaxTTL": 86400,
            "Compress": true
          },
          "PriceClass": "PriceClass_100",
          "ViewerCertificate": {
            "CloudFrontDefaultCertificate": true
          },
          "HttpVersion": "http2",
          "IPV6Enabled": true,
          "Logging": {
            "Bucket": {"Fn::GetAtt": ["CloudFrontLogsBucket", "DomainName"]},
            "Prefix": "cloudfront-logs/",
            "IncludeCookies": false
          },
          "Tags": [
            {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-CloudFront"}},
            {"Key": "Environment", "Value": {"Ref": "Environment"}}
          ]
        }
      }
    },
    
    "CloudFrontLogsBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "AccessControl": "LogDeliveryWrite",
        "VersioningConfiguration": {
          "Status": "Enabled"
        },
        "LifecycleConfiguration": {
          "Rules": [
            {
              "Id": "DeleteOldLogs",
              "Status": "Enabled",
              "ExpirationInDays": 90
            }
          ]
        },
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "${AWS::StackName}-CloudFrontLogs"}},
          {"Key": "Environment", "Value": {"Ref": "Environment"}}
        ]
      }
    }
  },
  
  "Conditions": {
    "IsProduction": {"Fn::Equals": [{"Ref": "Environment"}, "Production"]}
  },
  
  "Outputs": {
    "BackofficeURL": {
      "Description": "URL of the Backoffice application (ALB)",
      "Value": {"Fn::Join": ["", ["http://", {"Fn::GetAtt": ["BackofficeALB", "DNSName"]}]]}
    },
    "CloudFrontURL": {
      "Description": "CloudFront URL for the Backoffice application",
      "Value": {"Fn::Join": ["", ["https://", {"Fn::GetAtt": ["BackofficeCloudfrontDistribution", "DomainName"]}]]}
    },
    "DatabaseEndpoint": {
      "Description": "Endpoint of the Backoffice database",
      "Value": {"Fn::GetAtt": ["BackofficeDatabase", "Endpoint.Address"]}
    },
    "S3BucketName": {
      "Description": "Name of the S3 bucket for Backoffice assets",
      "Value": {"Ref": "BackofficeS3Bucket"}
    }
  }
};

module.exports = cloudformation;
